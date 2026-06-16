USE sipan;

ALTER TABLE solicitacoes_adocao
  ADD COLUMN pessoa_id BIGINT UNSIGNED NULL AFTER id,
  ADD KEY idx_adocao_pessoa (pessoa_id),
  ADD CONSTRAINT fk_adocao_pessoa
    FOREIGN KEY (pessoa_id) REFERENCES pessoas (id)
    ON DELETE SET NULL ON UPDATE CASCADE;
