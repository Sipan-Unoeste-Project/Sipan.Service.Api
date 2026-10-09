-- Alinha permissão Funcionário -> Financeiro (cadastro do sistema).
USE sipan;

UPDATE usuarios
SET permissao = 'Financeiro'
WHERE permissao = 'Funcionário';

ALTER TABLE usuarios
  MODIFY COLUMN permissao ENUM(
    'Administrador',
    'Financeiro',
    'Veterinário',
    'Voluntário'
  ) NOT NULL;
