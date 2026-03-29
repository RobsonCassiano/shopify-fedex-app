# Shopify FedEx App

Integracao entre Shopify e FedEx para consulta de pedidos e criacao de fulfillment.

## Estrutura

```text
shopify-fedex-app/
|-- backend/
|-- frontend/
|-- index.html
|-- .env.example
|-- shopify.app.toml
|-- package.json
`-- README.md
```

## Setup local

```bash
npm install
Copy-Item .env.example .env
```

Preencha o `.env` com:

- `SHOPIFY_SHOP_NAME`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_LOCATION_ID`
- `FEDEX_API_KEY`
- `FEDEX_SECRET_KEY`
- `FEDEX_ACCOUNT_NUMBER`
- `FEDEX_API_URL`
- `ALLOWED_ORIGIN`
- `RENDER_SYNC_BASE_URL`
- `VITE_API_URL`

## Render

Cadastre estas variaveis no serviço:

```env
PORT=3001
SHOPIFY_SHOP_NAME=automation-brazil.myshopify.com
SHOPIFY_API_KEY=your_shopify_client_id
SHOPIFY_API_SECRET=your_shopify_client_secret
SHOPIFY_LOCATION_ID=your_shopify_location_id
ALLOWED_ORIGIN=https://admin.shopify.com,https://fedex-shipping-api.onrender.com
RENDER_SYNC_BASE_URL=https://fedex-shipping-api.onrender.com
FEDEX_API_KEY=your_fedex_api_key
FEDEX_SECRET_KEY=your_fedex_secret_key
FEDEX_ACCOUNT_NUMBER=your_fedex_account_number
FEDEX_API_URL=https://apis.fedex.com
VITE_API_URL=https://fedex-shipping-api.onrender.com
NODE_ENV=production
```

## Comandos

```bash
npm run dev
npm run build
```

## Endpoints

- `GET /`
- `GET /health`
- `GET /orders`
- `POST /webhook/orders-paid`
