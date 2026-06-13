-- Corrige bancos criados pelo schema antigo do Sipan.Service.Web (sem limite_baixo_estoque).
USE sipan;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_estoque'
    AND COLUMN_NAME = 'limite_baixo_estoque'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE apac_estoque ADD COLUMN limite_baixo_estoque INT UNSIGNED NOT NULL DEFAULT 5 AFTER local',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
