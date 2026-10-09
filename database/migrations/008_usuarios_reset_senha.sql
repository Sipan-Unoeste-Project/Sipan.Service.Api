-- Token de recuperação de senha ("Esqueci minha senha").
USE sipan;

SET @col_token := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'reset_token'
);

SET @sql_token := IF(
  @col_token = 0,
  'ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(64) NULL AFTER senha_hash',
  'SELECT 1'
);
PREPARE stmt FROM @sql_token;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_expira := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'usuarios'
    AND COLUMN_NAME = 'reset_expira'
);

SET @sql_expira := IF(
  @col_expira = 0,
  'ALTER TABLE usuarios ADD COLUMN reset_expira DATETIME NULL AFTER reset_token',
  'SELECT 1'
);
PREPARE stmt FROM @sql_expira;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
