-- Auditoria básica de estoque: quem alterou e histórico de movimentos.
USE sipan;

SET @col_por_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_estoque'
    AND COLUMN_NAME = 'atualizado_por_id'
);
SET @sql_por_id := IF(
  @col_por_id = 0,
  'ALTER TABLE apac_estoque ADD COLUMN atualizado_por_id BIGINT UNSIGNED NULL AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql_por_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_por_nome := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_estoque'
    AND COLUMN_NAME = 'atualizado_por_nome'
);
SET @sql_por_nome := IF(
  @col_por_nome = 0,
  'ALTER TABLE apac_estoque ADD COLUMN atualizado_por_nome VARCHAR(150) NULL AFTER atualizado_por_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_por_nome;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS apac_estoque_movimentos (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  estoque_id         BIGINT UNSIGNED NULL,
  item_nome          VARCHAR(200)    NOT NULL,
  acao               ENUM('criacao', 'alteracao', 'ajuste', 'exclusao') NOT NULL,
  quantidade_antes   INT             NULL,
  quantidade_depois  INT             NULL,
  usuario_id         BIGINT UNSIGNED NULL,
  usuario_nome       VARCHAR(150)    NULL,
  detalhe            VARCHAR(255)    NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_estoque_mov_estoque (estoque_id),
  KEY idx_estoque_mov_created (created_at),
  CONSTRAINT fk_estoque_mov_item
    FOREIGN KEY (estoque_id) REFERENCES apac_estoque (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Histórico de alterações do estoque';
