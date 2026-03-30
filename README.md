# Shopify FedEx App

Integracao entre Shopify e FedEx para consulta de pedidos e criacao de fulfillment.

## Estrutura

```text
shopify-fedex-app/
|-- backend/
|-- extensions/
|-- frontend/
|-- index.html
|-- .env.example
|-- shopify.app.toml
|-- package.json
`-- README.md
```

## Projeto principal

Esta raiz e o projeto principal que deve ser commitado e publicado.

- `backend/` contem a API Express e integracoes Shopify/FedEx
- `frontend/` contem o painel web servido pelo backend
- `extensions/checkout-ui/` contem a extensao criada pela Shopify CLI para a app desta raiz

O diretorio `fed-ex-ship-psdu/` foi mantido separado e esta ignorado no Git da raiz para nao misturar dois apps Shopify diferentes no mesmo commit/deploy.

## Setup local

```bash
npm install
Copy-Item .env.example .env
```

Preencha o `.env` com:

- `SHOPIFY_SHOP`
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_LOCATION_ID`
- `SHOPIFY_API_VERSION`
- `FEDEX_API_KEY`
- `FEDEX_SECRET_KEY`
- `FEDEX_ACCOUNT_NUMBER`
- `FEDEX_API_URL`
- `ALLOWED_ORIGIN`
- `RENDER_SYNC_BASE_URL`
- `VITE_API_URL`

## Render

Cadastre estas variaveis no servico:

```env
PORT=3001
SHOPIFY_SHOP=automation-brazil
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
SHOPIFY_LOCATION_ID=your_shopify_location_id
SHOPIFY_API_VERSION=2026-01
ALLOWED_ORIGIN=https://admin.shopify.com,https://fedex-shipping-api.onrender.com
RENDER_SYNC_BASE_URL=https://fedex-shipping-api.onrender.com
FEDEX_API_KEY=your_fedex_api_key
FEDEX_SECRET_KEY=your_fedex_secret_key
FEDEX_ACCOUNT_NUMBER=your_fedex_account_number
FEDEX_API_URL=https://apis.fedex.com
VITE_API_URL=https://fedex-shipping-api.onrender.com
NODE_ENV=production
```

O backend continua aceitando `SHOPIFY_SHOP_NAME`, `SHOPIFY_API_KEY` e `SHOPIFY_API_SECRET` por compatibilidade, mas o padrao recomendado e usar os nomes acima, alinhados com a documentacao da Shopify.

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
