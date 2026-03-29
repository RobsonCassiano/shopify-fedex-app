/**
 * Shopify Integration Module
 * Handles all Shopify API interactions
 */
'use strict'
import fetch from 'node-fetch';

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function getShopDomain() {
  const shop = process.env.SHOPIFY_SHOP_NAME || process.env.SHOPIFY_SHOP;

  if (!shop) {
    throw new Error('SHOPIFY_SHOP_NAME ou SHOPIFY_SHOP nao foi configurado');
  }

  return shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
}

async function getShopifyAccessToken() {
  const staticToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (staticToken) {
    return staticToken;
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60_000) {
    return cachedAccessToken;
  }

  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_API_PASSWORD;

  if (!clientId || !clientSecret) {
    throw new Error('Configure SHOPIFY_ACCESS_TOKEN ou SHOPIFY_API_KEY + SHOPIFY_API_SECRET');
  }

  const shopDomain = getShopDomain();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Access Token error: ${text}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = now + ((data.expires_in || 86400) * 1000);

  return cachedAccessToken;
}

async function getShopifyHeaders() {
  const token = await getShopifyAccessToken();

  return {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json'
  };
}

export async function getShopifyOrders() {
  const shopDomain = getShopDomain();
  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/orders.json?status=any&limit=10`, {
    headers: await getShopifyHeaders()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify Orders error: ${text}`);
  }

  const data = await res.json();
  return data.orders || [];
}

export async function createFulfillment(order, trackingNumber) {
  const shopDomain = getShopDomain();
  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/fulfillments.json`, {
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
