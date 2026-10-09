-- Período de campanha: data de início e fim (encerramento automático pela data_fim).
USE sipan;

SET @col_inicio := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_campanhas'
    AND COLUMN_NAME = 'data_inicio'
);

SET @sql_inicio := IF(
  @col_inicio = 0,
  'ALTER TABLE apac_campanhas ADD COLUMN data_inicio DATE NULL AFTER descricao',
  'SELECT 1'
);
PREPARE stmt FROM @sql_inicio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_fim := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_campanhas'
    AND COLUMN_NAME = 'data_fim'
);

SET @sql_fim := IF(
  @col_fim = 0,
  'ALTER TABLE apac_campanhas ADD COLUMN data_fim DATE NULL AFTER data_inicio',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fim;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE apac_campanhas
SET
  data_inicio = COALESCE(data_inicio, data_evento),
  data_fim = COALESCE(data_fim, data_evento)
WHERE data_inicio IS NULL OR data_fim IS NULL;

ALTER TABLE apac_campanhas
  MODIFY COLUMN data_inicio DATE NOT NULL,
  MODIFY COLUMN data_fim DATE NOT NULL;
