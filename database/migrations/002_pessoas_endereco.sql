-- Endereço no cadastro de pessoas (CEP, logradouro, número, bairro, cidade, UF).
USE sipan;

ALTER TABLE pessoas
  ADD COLUMN cep VARCHAR(9) NULL AFTER email,
  ADD COLUMN endereco VARCHAR(200) NULL AFTER cep,
  ADD COLUMN numero VARCHAR(20) NULL AFTER endereco,
  ADD COLUMN bairro VARCHAR(100) NULL AFTER numero,
  ADD COLUMN cidade VARCHAR(100) NULL AFTER bairro,
  ADD COLUMN estado CHAR(2) NULL AFTER cidade;
