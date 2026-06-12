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

INSERT IGNORE INTO pessoa_tipos (pessoa_id, tipo)
SELECT id, tipo FROM pessoas WHERE tipo IS NOT NULL;

ALTER TABLE pessoas DROP INDEX idx_pessoas_tipo;
ALTER TABLE pessoas DROP COLUMN tipo;
