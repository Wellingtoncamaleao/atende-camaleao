-- Database initialization for Atende Camaleão

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    client_name VARCHAR(255),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    total_messages INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    escalated BOOLEAN DEFAULT FALSE,
    satisfaction_score INTEGER,
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    phone VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'in' ou 'out'
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT TRUE,
    intent VARCHAR(100),
    confidence DECIMAL(3,2),
    response_time_ms INTEGER,
    INDEX idx_conversation (conversation_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_intent (intent)
);

-- Tabela de contexto de clientes
CREATE TABLE IF NOT EXISTS client_context (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    company VARCHAR(255),
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    last_order_date DATE,
    preferences JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_phone (phone)
);

-- Tabela de intents e respostas
CREATE TABLE IF NOT EXISTS intents (
    id SERIAL PRIMARY KEY,
    intent VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    pattern TEXT,
    response_template TEXT,
    requires_api BOOLEAN DEFAULT FALSE,
    api_endpoint VARCHAR(255),
    count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_intent (intent)
);

-- Tabela de feedback
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    phone VARCHAR(20),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    INDEX idx_conversation (conversation_id),
    INDEX idx_rating (rating)
);

-- Tabela de analytics
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, metric_type),
    INDEX idx_date (date),
    INDEX idx_metric_type (metric_type)
);

-- Tabela de escalações
CREATE TABLE IF NOT EXISTS escalations (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    phone VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    assigned_to VARCHAR(255),
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolution TEXT,
    INDEX idx_status (status),
    INDEX idx_priority (priority)
);

-- Tabela de produtos (cache)
CREATE TABLE IF NOT EXISTS products_cache (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2),
    stock INTEGER,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP DEFAULT NOW(),
    INDEX idx_sku (sku),
    INDEX idx_category (category)
);

-- Tabela de pedidos consultados
CREATE TABLE IF NOT EXISTS order_queries (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    phone VARCHAR(20),
    order_id VARCHAR(50),
    order_status VARCHAR(100),
    order_value DECIMAL(10,2),
    query_timestamp TIMESTAMP DEFAULT NOW(),
    INDEX idx_order_id (order_id)
);

-- Views úteis

-- View de conversas ativas
CREATE VIEW active_conversations AS
SELECT 
    c.id,
    c.phone,
    c.client_name,
    c.started_at,
    c.total_messages,
    (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message,
    (SELECT timestamp FROM messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_activity
FROM conversations c
WHERE c.status = 'active'
ORDER BY last_activity DESC;

-- View de métricas diárias
CREATE VIEW daily_metrics AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_conversations,
    AVG(total_messages) as avg_messages,
    SUM(CASE WHEN resolved = TRUE THEN 1 ELSE 0 END) as resolved_count,
    SUM(CASE WHEN escalated = TRUE THEN 1 ELSE 0 END) as escalated_count,
    AVG(satisfaction_score) as avg_satisfaction
FROM conversations
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- View de top intents
CREATE VIEW top_intents AS
SELECT 
    intent,
    COUNT(*) as count,
    AVG(confidence) as avg_confidence,
    AVG(response_time_ms) as avg_response_time
FROM messages
WHERE intent IS NOT NULL
GROUP BY intent
ORDER BY count DESC
LIMIT 20;

-- Inserir intents padrão
INSERT INTO intents (intent, description, pattern, response_template, requires_api) VALUES
('greeting', 'Saudação inicial', 'oi|olá|bom dia|boa tarde|boa noite', 'Olá! Sou a Vivi, atendente virtual da Camaleão Camisas. Como posso ajudar você hoje?', FALSE),
('price_inquiry', 'Consulta de preços', 'preço|valor|quanto custa|tabela', 'Vou consultar nossa tabela de preços para você...', TRUE),
('order_status', 'Status de pedido', 'pedido|status|entrega|prazo', 'Vou verificar o status do seu pedido...', TRUE),
('product_catalog', 'Catálogo de produtos', 'produtos|catálogo|opções|tecidos', 'Temos diversas opções de produtos...', FALSE),
('quote_request', 'Solicitação de orçamento', 'orçamento|cotação|proposta', 'Vou preparar um orçamento para você...', TRUE),
('human_agent', 'Solicitar atendimento humano', 'falar com alguém|atendente|vendedor|humano', 'Vou transferir você para um de nossos vendedores...', FALSE)
ON CONFLICT (intent) DO NOTHING;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para client_context
CREATE TRIGGER update_client_context_updated_at 
BEFORE UPDATE ON client_context 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_messages_phone_timestamp ON messages(phone, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_phone_started ON conversations(phone, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_date_type ON analytics(date DESC, metric_type);

-- Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO camaleao;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO camaleao;