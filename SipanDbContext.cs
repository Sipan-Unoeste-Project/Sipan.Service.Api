using Microsoft.EntityFrameworkCore;
using Sipan.Service.Api.Models;

namespace Sipan.Service.Api.Data;

public class SipanDbContext(DbContextOptions<SipanDbContext> options) : DbContext(options)
{
    public DbSet<Pessoa> Pessoas => Set<Pessoa>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Pessoa>(entity =>
        {
            entity.Property(p => p.Tipo).HasConversion<string>();
        });
    }
}
