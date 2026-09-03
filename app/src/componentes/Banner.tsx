/** Aviso fixo de erro de persistência (spec §7). */
export function Banner({ mensagem }: { mensagem: string | null }) {
  if (mensagem === null) return null
  return (
    <p role="status" className="banner-alerta">
      {mensagem}
    </p>
  )
}
