import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

/**
 * AnalyticsTab Component
 * 
 * Este componente renderiza un gráfico de dispersión (scatter plot) de los fondos
 * comparando Riesgo vs Retorno Esperado usando Chart.js 4.4.0.
 */
const AnalyticsTab = ({ funds }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!funds || !chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');

        // Destruir instancia previa si existe
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        // Colores y configuración por tipo de fondo
        const categories = {
            4: { label: 'Money Market', color: 'rgba(34, 197, 94, 0.7)', border: '#22c55e' },
            3: { label: 'Fixed Income', color: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6' },
            5: { label: 'Mixed', color: 'rgba(249, 115, 22, 0.7)', border: '#f97316' },
            2: { label: 'Equity', color: 'rgba(168, 85, 247, 0.7)', border: '#a855f7' }
        };

        // Agrupar datos en múltiples datasets para la leyenda avanzada
        const datasets = Object.keys(categories).map(typeId => {
            const filteredFunds = funds.filter(f => String(f.tipoRentaId) === typeId);
            return {
                label: `${categories[typeId].label} (${filteredFunds.length} fondos)`,
                data: filteredFunds.map(f => ({
                    x: f.riskScore,
                    y: f.expectedReturn,
                    name: f.name,
                    id: f.id
                })),
                backgroundColor: categories[typeId].color,
                borderColor: categories[typeId].border,
                borderWidth: 1,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointHoverBorderWidth: 2
            };
        });

        // Inicializar Chart.js
        chartInstance.current = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Risk-Return de Fondos de Inversión',
                        color: '#fff',
                        font: { size: 20, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#ccc',
                            padding: 20,
                            font: { size: 13 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#ddd',
                        padding: 15,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => {
                                const item = context.raw;
                                return [
                                    `Fondo: ${item.name}`,
                                    `Riesgo: ${item.x}`,
                                    `Retorno Esperado: ${item.y.toFixed(2)}%`,
                                    `ID: ${item.id}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Nivel de Riesgo (0-10)',
                            color: '#aaa',
                            font: { weight: 'bold' }
                        },
                        min: 0,
                        max: 10,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#888' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Retorno Esperado (%)',
                            color: '#aaa',
                            font: { weight: 'bold' }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#888' }
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [funds]);

    return (
        <div className="analytics-view" style={{ padding: '2rem', height: '100%' }}>
            <div className="analytics-header" style={{ marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>📊 ANALYTICS: RISK-RETURN</h2>
                <p style={{ opacity: 0.7 }}>Visualización comparativa de todos los fondos del mercado.</p>
            </div>

            <div className="analytics-container" style={{ position: 'relative', height: '600px', width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-ultra)' }}>
                <canvas ref={chartRef}></canvas>
            </div>

            <style jsx>{`
        .analytics-view {
          color: white;
          animation: fade-in 0.3s ease;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default AnalyticsTab;
