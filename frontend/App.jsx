import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import './styles.css';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function App() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${apiBaseUrl}/orders`);

        if (!response.ok) {
          throw new Error('Nao foi possivel carregar os pedidos.');
        }

        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <div className="container">
      <h1>Pedidos Shopify</h1>
      <p className="text-muted mb-lg">Painel de consulta dos pedidos sincronizados com a FedEx.</p>

      {loading ? <p>Carregando pedidos...</p> : null}
      {error ? <p className="text-danger">{error}</p> : null}

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
                    <button className="btn-primary" disabled={order.fulfillment_status === 'fulfilled'}>
                      Enviar FedEx
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
