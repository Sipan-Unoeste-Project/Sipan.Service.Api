-- Tabelas APAC (estoque e campanhas). Banco: sipan
-- Origem: APAC/database/schema.sql

USE sipan;

CREATE TABLE IF NOT EXISTS apac_campanhas (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome         VARCHAR(200)    NOT NULL,
  descricao    TEXT            NULL,
  data_evento  DATE            NOT NULL,
  meta         DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
  arrecadado   DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
  status       ENUM('planejada', 'ativa', 'concluida', 'cancelada') NOT NULL DEFAULT 'planejada',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_campanhas_status (status),
  KEY idx_campanhas_data (data_evento)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_estoque (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item                 VARCHAR(200)    NOT NULL,
  categoria            ENUM('alimentos', 'medicamentos', 'limpeza', 'acessorios') NOT NULL,
  quantidade           INT UNSIGNED    NOT NULL DEFAULT 0,
  unidade              ENUM('unidades', 'kg', 'litros', 'pacotes') NOT NULL DEFAULT 'unidades',
  validade             DATE            NULL,
  local                VARCHAR(120)    NULL,
  limite_baixo_estoque INT UNSIGNED    NOT NULL DEFAULT 5,
  status               ENUM('normal', 'baixo') NOT NULL DEFAULT 'normal',
  created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_estoque_categoria (categoria),
  KEY idx_estoque_validade (validade),
  KEY idx_estoque_status (status)
) ENGINE=InnoDB;
