-- Um cadastro por pessoa; perfis doador/adotante em pessoa_tipos.
USE sipan;

CREATE TABLE IF NOT EXISTS pessoa_tipos (
  pessoa_id BIGINT UNSIGNED NOT NULL,
  tipo      ENUM('doador', 'adotante') NOT NULL,
  PRIMARY KEY (pessoa_id, tipo),
  CONSTRAINT fk_pessoa_tipos_pessoa
    FOREIGN KEY (pessoa_id) REFERENCES pessoas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

SET @tipo_col := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pessoas'
    AND COLUMN_NAME = 'tipo'
);

SET @sql := IF(
  @tipo_col > 0,
  'INSERT IGNORE INTO pessoa_tipos (pessoa_id, tipo) SELECT id, tipo FROM pessoas WHERE tipo IS NOT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'pessoas'
    AND INDEX_NAME = 'idx_pessoas_tipo'
);

SET @sql := IF(
  @idx_exists > 0,
  'ALTER TABLE pessoas DROP INDEX idx_pessoas_tipo',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @tipo_col > 0,
  'ALTER TABLE pessoas DROP COLUMN tipo',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
