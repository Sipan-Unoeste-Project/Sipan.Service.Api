USE sipan;

SET @tabela := 'apac_saude_registros';
SET @coluna := 'alterado_por_id';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN alterado_por_id BIGINT UNSIGNED NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'alterado_por_nome';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN alterado_por_nome VARCHAR(150) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'anulada_em';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN anulada_em TIMESTAMP NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'anulada_por_id';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN anulada_por_id BIGINT UNSIGNED NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'anulada_por_nome';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN anulada_por_nome VARCHAR(150) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'motivo_anulacao';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN motivo_anulacao VARCHAR(500) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @tabela := 'apac_saude_vacinas';
SET @coluna := 'alterado_por_id';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN alterado_por_id BIGINT UNSIGNED NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'alterado_por_nome';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN alterado_por_nome VARCHAR(150) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'anulada_em';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN anulada_em TIMESTAMP NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'anulada_por_id';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN anulada_por_id BIGINT UNSIGNED NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'anulada_por_nome';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN anulada_por_nome VARCHAR(150) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @coluna := 'motivo_anulacao';
SET @sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tabela AND COLUMN_NAME = @coluna) = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN motivo_anulacao VARCHAR(500) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_cascade := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_registros'
    AND CONSTRAINT_NAME = 'fk_saude_registros_animal'
    AND DELETE_RULE = 'CASCADE'
);
SET @sql_fk := IF(
  @fk_cascade > 0,
  'ALTER TABLE apac_saude_registros DROP FOREIGN KEY fk_saude_registros_animal',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_registros'
    AND CONSTRAINT_NAME = 'fk_saude_registros_animal'
);
SET @sql_fk := IF(
  @fk_exists = 0,
  'ALTER TABLE apac_saude_registros ADD CONSTRAINT fk_saude_registros_animal FOREIGN KEY (animal_id) REFERENCES animais (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_cascade := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_vacinas'
    AND CONSTRAINT_NAME = 'fk_saude_vacinas_animal'
    AND DELETE_RULE = 'CASCADE'
);
SET @sql_fk := IF(
  @fk_cascade > 0,
  'ALTER TABLE apac_saude_vacinas DROP FOREIGN KEY fk_saude_vacinas_animal',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_vacinas'
    AND CONSTRAINT_NAME = 'fk_saude_vacinas_animal'
);
SET @sql_fk := IF(
  @fk_exists = 0,
  'ALTER TABLE apac_saude_vacinas ADD CONSTRAINT fk_saude_vacinas_animal FOREIGN KEY (animal_id) REFERENCES animais (id) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
