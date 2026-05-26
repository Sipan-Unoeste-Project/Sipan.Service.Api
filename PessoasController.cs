using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sipan.Service.Api.Data;
using Sipan.Service.Api.Dtos;
using Sipan.Service.Api.Models;

namespace Sipan.Service.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PessoasController(SipanDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PessoaDto>>> Listar(
        [FromQuery] string? tipo,
        [FromQuery] string? busca,
        CancellationToken ct)
    {
        var query = db.Pessoas.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(tipo) && tipo != "todos")
            query = query.Where(p => p.Tipo == tipo);

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var q = busca.Trim().ToLower();
            query = query.Where(p =>
                p.Nome.ToLower().Contains(q) ||
                p.Cpf.Contains(q) ||
                p.Telefone.Contains(q) ||
                (p.Email != null && p.Email.ToLower().Contains(q)));
        }

        var lista = await query
            .OrderByDescending(p => p.CriadoEm)
            .ThenBy(p => p.Nome)
            .ToListAsync(ct);

        return Ok(lista.Select(ToDto));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PessoaDto>> Obter(long id, CancellationToken ct)
    {
        var pessoa = await db.Pessoas.AsNoTracking().FirstOrDefaultAsync(p => p.Id == (ulong)id, ct);
        if (pessoa is null) return NotFound();
        return Ok(ToDto(pessoa));
    }

    [HttpPost]
    public async Task<ActionResult<PessoaDto>> Criar([FromBody] SalvarPessoaRequest request, CancellationToken ct)
    {
        var cpf = NormalizarCpf(request.Cpf);
        if (await CpfExisteAsync(cpf, null, ct))
            return Conflict(new { mensagem = "CPF já cadastrado." });

        var pessoa = new Pessoa
        {
            Nome = request.Nome.Trim(),
            Cpf = request.Cpf.Trim(),
            Tipo = request.Tipo,
            Telefone = request.Telefone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Observacoes = string.IsNullOrWhiteSpace(request.Obs) ? null : request.Obs.Trim(),
            CriadoEm = DateOnly.FromDateTime(DateTime.Today),
        };

        db.Pessoas.Add(pessoa);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Obter), new { id = pessoa.Id }, ToDto(pessoa));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<PessoaDto>> Atualizar(long id, [FromBody] SalvarPessoaRequest request, CancellationToken ct)
    {
        var pessoa = await db.Pessoas.FirstOrDefaultAsync(p => p.Id == (ulong)id, ct);
        if (pessoa is null) return NotFound();

        var cpf = NormalizarCpf(request.Cpf);
        if (await CpfExisteAsync(cpf, id, ct))
            return Conflict(new { mensagem = "CPF já cadastrado." });

        pessoa.Nome = request.Nome.Trim();
        pessoa.Cpf = request.Cpf.Trim();
        pessoa.Tipo = request.Tipo;
        pessoa.Telefone = request.Telefone.Trim();
        pessoa.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        pessoa.Observacoes = string.IsNullOrWhiteSpace(request.Obs) ? null : request.Obs.Trim();

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(pessoa));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Excluir(long id, CancellationToken ct)
    {
        var pessoa = await db.Pessoas.FirstOrDefaultAsync(p => p.Id == (ulong)id, ct);
        if (pessoa is null) return NotFound();

        db.Pessoas.Remove(pessoa);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    static string NormalizarCpf(string cpf) =>
        new string(cpf.Where(char.IsDigit).ToArray());

    async Task<bool> CpfExisteAsync(string cpfDigits, long? ignorarId, CancellationToken ct)
    {
        var lista = await db.Pessoas
            .AsNoTracking()
            .Where(p => ignorarId == null || p.Id != (ulong)ignorarId.Value)
            .Select(p => p.Cpf)
            .ToListAsync(ct);

        return lista.Any(c => NormalizarCpf(c) == cpfDigits);
    }

    static PessoaDto ToDto(Pessoa p) => new(
        (long)p.Id,
        p.Nome,
        p.Cpf,
        p.Tipo,
        p.Telefone,
        p.Email,
        p.Observacoes,
        p.CriadoEm.ToString("yyyy-MM-dd")
    );
}
