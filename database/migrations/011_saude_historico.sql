USE sipan;

SET @col_registro_criado_por_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_registros'
    AND COLUMN_NAME = 'criado_por_id'
);
SET @sql_registro_criado_por_id := IF(
  @col_registro_criado_por_id = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN criado_por_id BIGINT UNSIGNED NULL AFTER veterinario',
  'SELECT 1'
);
PREPARE stmt FROM @sql_registro_criado_por_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_registro_criado_por_nome := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_registros'
    AND COLUMN_NAME = 'criado_por_nome'
);
SET @sql_registro_criado_por_nome := IF(
  @col_registro_criado_por_nome = 0,
  'ALTER TABLE apac_saude_registros ADD COLUMN criado_por_nome VARCHAR(150) NULL AFTER criado_por_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_registro_criado_por_nome;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_vacina_descricao := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_vacinas'
    AND COLUMN_NAME = 'descricao'
);
SET @sql_vacina_descricao := IF(
  @col_vacina_descricao = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN descricao TEXT NULL AFTER data_proxima',
  'SELECT 1'
);
PREPARE stmt FROM @sql_vacina_descricao;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_vacina_veterinario := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_vacinas'
    AND COLUMN_NAME = 'veterinario'
);
SET @sql_vacina_veterinario := IF(
  @col_vacina_veterinario = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN veterinario VARCHAR(150) NULL AFTER descricao',
  'SELECT 1'
);
PREPARE stmt FROM @sql_vacina_veterinario;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_vacina_criado_por_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_vacinas'
    AND COLUMN_NAME = 'criado_por_id'
);
SET @sql_vacina_criado_por_id := IF(
  @col_vacina_criado_por_id = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN criado_por_id BIGINT UNSIGNED NULL AFTER veterinario',
  'SELECT 1'
);
PREPARE stmt FROM @sql_vacina_criado_por_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_vacina_criado_por_nome := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'apac_saude_vacinas'
    AND COLUMN_NAME = 'criado_por_nome'
);
SET @sql_vacina_criado_por_nome := IF(
  @col_vacina_criado_por_nome = 0,
  'ALTER TABLE apac_saude_vacinas ADD COLUMN criado_por_nome VARCHAR(150) NULL AFTER criado_por_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_vacina_criado_por_nome;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
