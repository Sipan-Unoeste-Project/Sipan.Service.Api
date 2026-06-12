USE sipan;

CREATE TABLE IF NOT EXISTS solicitacoes_adocao (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome_adotante     VARCHAR(150)    NOT NULL,
  cpf               VARCHAR(14)     NOT NULL,
  telefone          VARCHAR(20)     NOT NULL,
  email             VARCHAR(150)    NOT NULL,
  endereco          VARCHAR(255)    NULL,
  animal_id         BIGINT UNSIGNED NOT NULL,
  motivo            TEXT            NOT NULL,
  tem_outros_animais VARCHAR(10)    NULL,
  tem_criancas      VARCHAR(10)     NULL,
  tipo_residencia   VARCHAR(80)     NOT NULL,
  aceita_termo      TINYINT(1)      NOT NULL DEFAULT 0,
  status            VARCHAR(30)     NOT NULL DEFAULT 'Pendente',
  data_solicitacao  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_adocao_status (status),
  KEY idx_adocao_animal (animal_id),
  KEY idx_adocao_nome (nome_adotante),
  CONSTRAINT fk_adocao_animal
    FOREIGN KEY (animal_id) REFERENCES animais (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  COMMENT='Solicitações de adoção de animais';
