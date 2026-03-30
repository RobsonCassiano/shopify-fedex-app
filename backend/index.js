import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createFulfillment, getShopifyOrdersConnection } from './shopify.js';
import { createFedexShipment } from './fedex.js';
import { alreadyProcessed, markProcessed } from './storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const app = express();
const port = Number(process.env.PORT || 3001);
const configuredOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const renderBaseUrl = process.env.RENDER_SYNC_BASE_URL;
const renderOrigin = renderBaseUrl ? new URL(renderBaseUrl).origin : null;
const allowedOrigins = new Set(
  [
    ...configuredOrigins,
    renderOrigin,
    'http://localhost:3001',
    'http://localhost:4173',
    'http://localhost:5173',
    'https://admin.shopify.com'
  ].filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin nao permitida pelo CORS'));
  }
}));
app.use(express.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(distDir));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Webhook Shopify (simplificado)
app.post('/webhook/orders-paid', async (req, res) => {
  const order = req.body;

  try {
    if (await alreadyProcessed(order.id)) {
      return res.status(200).send('Already processed');
    }

    // Transforma pedido Shopify em payload FedEx
    const fedexPayload = transformToFedex(order);

    // Cria shipment FedEx (com PSDU)
    const shipment = await createFedexShipment(fedexPayload);

    // Cria fulfillment Shopify com tracking
    await createFulfillment(order, shipment.trackingNumber);

    await markProcessed(order.id);

    res.status(200).send('Success');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

// Listar pedidos para frontend
app.get('/orders', async (req, res) => {
  try {
    const first = req.query.first;
    const after = req.query.after;
    const ordersConnection = await getShopifyOrdersConnection({ first, after });
    res.json(ordersConnection);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({
      error: 'Nao foi possivel listar pedidos',
      details: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

function transformToFedex(order) {
  return {
    requestedShipment: {
      shipper: {
        contact: { personName: "Sua Empresa" },
        address: { streetLines: ["Rua Exemplo 123"], city: "Sao Paulo", postalCode: "01000-000", countryCode: "BR" }
      },
      recipients: [{
        contact: {
          personName: order.shipping_address?.name || 'Cliente',
          phoneNumber: order.shipping_address?.phone || ''
        },
        address: {
          streetLines: [order.shipping_address?.address1 || ''],
          city: order.shipping_address?.city || '',
          postalCode: order.shipping_address?.zip || '',
          countryCode: order.shipping_address?.country_code || ''
        }
      }],
      serviceType: "INTERNATIONAL_ECONOMY",
      packagingType: "YOUR_PACKAGING",
      shipmentSpecialServices: {
        specialServiceTypes: ["ELECTRONIC_TRADE_DOCUMENTS"]
      },
      requestedPackageLineItems: order.line_items.map(item => ({
        weight: { units: "KG", value: 1 }
      }))
    }
  };
}

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});
