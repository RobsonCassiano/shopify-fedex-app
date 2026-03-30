/**
 * Shopify Integration Module
 * Handles all Shopify API interactions
 */
'use strict'
import fetch from 'node-fetch';

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-01';
const DEFAULT_ORDERS_LIMIT = 10;

function getShopDomain() {
  const shop = process.env.SHOPIFY_SHOP || process.env.SHOPIFY_SHOP_NAME;

  if (!shop) {
    throw new Error('SHOPIFY_SHOP ou SHOPIFY_SHOP_NAME nao foi configurado');
  }

  return shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
}

async function getShopifyAccessToken() {
  return process.env.SHOPIFY_ACCESS_TOKEN;
}

async function getShopifyHeaders() {
  const token = await getShopifyAccessToken();

  return {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json'
  };
}

async function shopifyGraphql(query, variables = {}) {
  const shopDomain = getShopDomain();
  const res = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: await getShopifyHeaders(),
    body: JSON.stringify({
      query,
      variables
    })
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok || data.errors || data.data?.orders?.errors) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(data)}`);
  }

  return data.data;
}

function normalizeOrder(node) {
  const customerName = (node.customer?.displayName || '').trim();
  const [firstName = '', ...lastNameParts] = customerName ? customerName.split(/\s+/) : [];

  return {
    id: node.legacyResourceId || node.id,
    name: node.name,
    fulfillment_status: node.displayFulfillmentStatus?.toLowerCase() || null,
    customer: {
      first_name: firstName,
      last_name: lastNameParts.join(' ')
    }
  };
}

export async function getShopifyOrders() {
  return getShopifyOrdersConnection();
}

export async function getShopifyOrdersConnection({ first = DEFAULT_ORDERS_LIMIT, after } = {}) {
  const query = `
    query GetOrders($first: Int!, $after: String) {
      orders(first: $first, after: $after, reverse: true, sortKey: PROCESSED_AT) {
        edges {
          cursor
          node {
            id
            legacyResourceId
            name
            displayFulfillmentStatus
            customer {
              displayName
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  `;

  const normalizedFirst = Number.isFinite(Number(first)) ? Math.min(Math.max(Number(first), 1), 50) : DEFAULT_ORDERS_LIMIT;
  const data = await shopifyGraphql(query, {
    first: normalizedFirst,
    after: after || null
  });

  return {
    orders: (data.orders?.edges || []).map(({ node }) => normalizeOrder(node)),
    pageInfo: data.orders?.pageInfo || {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null
    }
  };
}

export async function createFulfillment(order, trackingNumber) {
  const shopDomain = getShopDomain();
  const res = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/fulfillments.json`, {
    method: 'POST',
    headers: await getShopifyHeaders(),
    body: JSON.stringify({
      fulfillment: {
        location_id: process.env.SHOPIFY_LOCATION_ID,
        tracking_number: trackingNumber,
        tracking_company: 'FedEx',
        notify_customer: true,
        line_items: order.line_items.map(item => ({ id: item.id, quantity: item.quantity }))
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify Fulfillment error: ${text}`);
  }

  return await res.json();
}
