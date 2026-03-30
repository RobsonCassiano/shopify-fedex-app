import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import './styles.css';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function App() {
  const [orders, setOrders] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shippingOrderId, setShippingOrderId] = useState('');
  const [shippingMessage, setShippingMessage] = useState('');

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${apiBaseUrl}/orders`);

        if (!response.ok) {
          let message = 'Nao foi possivel carregar os pedidos.';

          try {
            const errorData = await response.json();
            message = errorData?.details || errorData?.error || message;
          } catch {
            // Mantem a mensagem padrao quando a resposta nao for JSON.
          }

          throw new Error(message);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setOrders(data);
          setPageInfo(null);
          return;
        }

        setOrders(Array.isArray(data?.orders) ? data.orders : []);
        setPageInfo(data?.pageInfo || null);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  async function handleShipOrder(order) {
    try {
      setShippingOrderId(order.id);
      setShippingMessage('');
      setError('');

      const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(order.shopify_graphql_id)}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.details || data?.error || 'Nao foi possivel enviar o pedido para a FedEx.');
      }

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? { ...currentOrder, fulfillment_status: 'fulfilled' }
            : currentOrder
        )
      );

      if (data?.status === 'already_processed') {
        setShippingMessage(`O pedido ${order.name || order.id} ja tinha sido processado.`);
        return;
      }

      setShippingMessage(`Pedido ${order.name || order.id} enviado com sucesso para a FedEx.`);
    } catch (shipError) {
      setError(shipError.message);
    } finally {
      setShippingOrderId('');
    }
  }

  return (
    <div className="container">
      <h1>Pedidos Shopify</h1>
      <p className="text-muted mb-lg">Painel de consulta dos pedidos sincronizados com a FedEx.</p>

      {loading ? <p>Carregando pedidos...</p> : null}
      {error ? <p className="text-danger">{error}</p> : null}
      {shippingMessage ? <p>{shippingMessage}</p> : null}
      {!loading && !error && pageInfo?.hasNextPage ? <p className="text-muted">Existem mais pedidos disponiveis na Shopify.</p> : null}

      {!loading && !error ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }} border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Status fulfillment</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">Nenhum pedido encontrado.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.name || order.id}</td>
                  <td>{[order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || 'Cliente sem nome'}</td>
                  <td>{order.fulfillment_status || 'Unfulfilled'}</td>
                  <td>
                    <button
                      className="btn-primary"
                      disabled={order.fulfillment_status === 'fulfilled' || shippingOrderId === order.id}
                      onClick={() => handleShipOrder(order)}
                    >
                      {shippingOrderId === order.id ? 'Enviando...' : 'Enviar FedEx'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
