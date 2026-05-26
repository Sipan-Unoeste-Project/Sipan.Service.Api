using System.ComponentModel.DataAnnotations;

namespace Sipan.Service.Api.Dtos;

public record PessoaDto(
    long Id,
    string Nome,
    string Cpf,
    string Tipo,
    string Telefone,
    string? Email,
    string? Obs,
    string CriadoEm
);

public class SalvarPessoaRequest
{
    [Required, MaxLength(150)]
    public string Nome { get; set; } = string.Empty;

    [Required, MaxLength(14)]
    public string Cpf { get; set; } = string.Empty;

    [Required]
    public string Tipo { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Telefone { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Email { get; set; }

    public string? Obs { get; set; }
}
