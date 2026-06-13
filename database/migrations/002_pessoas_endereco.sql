-- Endereço no cadastro de pessoas (CEP, logradouro, número, bairro, cidade, UF).
USE sipan;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pessoas'
    AND COLUMN_NAME = 'cep'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE pessoas
     ADD COLUMN cep VARCHAR(9) NULL AFTER email,
     ADD COLUMN endereco VARCHAR(200) NULL AFTER cep,
     ADD COLUMN numero VARCHAR(20) NULL AFTER endereco,
     ADD COLUMN bairro VARCHAR(100) NULL AFTER numero,
     ADD COLUMN cidade VARCHAR(100) NULL AFTER bairro,
     ADD COLUMN estado CHAR(2) NULL AFTER cidade',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
