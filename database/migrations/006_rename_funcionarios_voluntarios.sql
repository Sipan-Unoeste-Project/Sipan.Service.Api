-- Renomeia funcionarios -> voluntarios (API e front usam voluntarios).
USE sipan;

SET @func_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'funcionarios'
);

SET @vol_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'voluntarios'
);

SET @sql := IF(
  @func_exists > 0 AND @vol_exists = 0,
  'RENAME TABLE funcionarios TO voluntarios',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
