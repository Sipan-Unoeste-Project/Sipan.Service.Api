-- Tabelas APAC adicionais (doações, financeiro, despesas, saúde).
-- Execute após apac_schema.sql e com tabelas base sipan (pessoas, animais, …) já criadas.
-- Origem alinhada com Sipan.Service.Web/database/schema.sql

USE sipan;

CREATE TABLE IF NOT EXISTS apac_doacoes (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo              ENUM('dinheiro', 'produto') NOT NULL,
  nome              VARCHAR(150)    NULL,
  telefone          VARCHAR(20)     NULL,
  email             VARCHAR(150)    NULL,
  valor             DECIMAL(12, 2)  NULL,
  forma_pagamento   VARCHAR(40)     NULL,
  campanha_id       BIGINT UNSIGNED NULL,
  mensagem          TEXT            NULL,
  anonimo           TINYINT(1)      NOT NULL DEFAULT 0,
  data_doacao       DATE            NOT NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_doacoes_tipo (tipo),
  KEY idx_doacoes_data (data_doacao),
  CONSTRAINT fk_doacoes_campanha
    FOREIGN KEY (campanha_id) REFERENCES apac_campanhas (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_doacao_itens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  doacao_id   BIGINT UNSIGNED NOT NULL,
  produto     VARCHAR(150)    NOT NULL,
  quantidade  VARCHAR(30)     NOT NULL,
  unidade     VARCHAR(40)     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_doacao_itens_doacao (doacao_id),
  CONSTRAINT fk_doacao_itens_doacao
    FOREIGN KEY (doacao_id) REFERENCES apac_doacoes (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_financeiro_entradas (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  origem          VARCHAR(100)    NOT NULL,
  valor           DECIMAL(12, 2)  NOT NULL,
  data_lancamento DATE            NOT NULL,
  responsavel     VARCHAR(150)    NULL,
  campanha_id     BIGINT UNSIGNED NULL,
  observacoes     TEXT            NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fin_entradas_campanha
    FOREIGN KEY (campanha_id) REFERENCES apac_campanhas (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_financeiro_saidas (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo_despesa    VARCHAR(100)    NOT NULL,
  valor           DECIMAL(12, 2)  NOT NULL,
  data_lancamento DATE            NOT NULL,
  fornecedor      VARCHAR(150)    NULL,
  animal_id       BIGINT UNSIGNED NULL,
  observacoes     TEXT            NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fin_saidas_animal
    FOREIGN KEY (animal_id) REFERENCES animais (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_despesa_categorias (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(100)    NOT NULL,
  descricao   VARCHAR(255)    NULL,
  icone       VARCHAR(10)     NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_despesa_categorias_nome (nome)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_despesas (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id    BIGINT UNSIGNED NULL,
  categoria_nome  VARCHAR(100)    NOT NULL,
  valor           DECIMAL(12, 2)  NOT NULL,
  data_despesa    DATE            NOT NULL,
  fornecedor      VARCHAR(150)    NULL,
  animal_id       BIGINT UNSIGNED NULL,
  forma_pagamento ENUM('PIX', 'Dinheiro', 'Cartão', 'Transferência') NOT NULL DEFAULT 'PIX',
  descricao       TEXT            NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_despesas_categoria
    FOREIGN KEY (categoria_id) REFERENCES apac_despesa_categorias (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_despesas_animal
    FOREIGN KEY (animal_id) REFERENCES animais (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_saude_registros (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id     BIGINT UNSIGNED NOT NULL,
  tipo          ENUM('consulta', 'vacina', 'exame', 'cirurgia') NOT NULL,
  titulo        VARCHAR(200)    NOT NULL,
  descricao     TEXT            NULL,
  data_registro DATE            NOT NULL,
  veterinario   VARCHAR(150)    NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_saude_registros_animal
    FOREIGN KEY (animal_id) REFERENCES animais (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apac_saude_vacinas (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id     BIGINT UNSIGNED NOT NULL,
  nome          VARCHAR(150)    NOT NULL,
  data_aplicada DATE            NOT NULL,
  data_proxima  DATE            NULL,
  status        ENUM('em_dia', 'a_vencer', 'vencida') NOT NULL DEFAULT 'em_dia',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_saude_vacinas_animal
    FOREIGN KEY (animal_id) REFERENCES animais (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO apac_despesa_categorias (nome, descricao, icone) VALUES
  ('Veterinário', 'Consultas, cirurgias e honorários veterinários', '🩺'),
  ('Alimentação / Ração', 'Ração, petiscos e suplementos', '🥣'),
  ('Medicamentos', 'Remédios, vacinas e materiais de curativo', '💊'),
  ('Material de Limpeza', 'Produtos de higiene e limpeza do canil', '🧴'),
  ('Transporte', 'Combustível e locomoção para resgates', '🚗')
ON DUPLICATE KEY UPDATE descricao = VALUES(descricao), icone = VALUES(icone);
