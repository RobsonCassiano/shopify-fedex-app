const processedOrders = new Set();

export async function alreadyProcessed(orderId) {
  return processedOrders.has(orderId);
}

export async function markProcessed(orderId) {
  processedOrders.add(orderId);
}