import { Edges, Html, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import type { Arranjo, ContextoDeArranjo } from '../nucleo/arranjo.js'
import type { Estante } from '../nucleo/estante.js'
import { mapear, type ObjetoNaCena } from './mapear.js'

/**
 * Cena 3D burra por design (spec §9): recebe `Arranjo` pronto e desenha, nunca
 * decide posição — isso é trabalho de `mapear`. Nenhum texto 3D por padrão; o
 * nome aparece em HTML sobreposto no jogo sob o cursor.
 *
 * @example <CenaDoArranjo arranjo={arranjo} contexto={contexto} estante={estante} aoClicarJogo={id => ...} />
 */
export function CenaDoArranjo({
  arranjo,
  contexto,
  estante,
  aoClicarJogo,
}: {
  arranjo: Arranjo
  contexto: ContextoDeArranjo
  estante: Estante
  aoClicarJogo: (idJogo: string) => void
}) {
  const cena = mapear(arranjo, contexto, estante)
  const [idEmFoco, setIdEmFoco] = useState<string | null>(null)

  return (
    <Canvas camera={{ position: [0, 1, 3] }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 4]} intensity={0.8} />
      <OrbitControls />

      {cena.prateleiras.map((prateleira) => (
        <mesh key={prateleira.idCompartimento} position={prateleira.posicaoXYZ}>
          <boxGeometry args={prateleira.dimensoesXYZ as [number, number, number]} />
          <meshStandardMaterial color="#c9b48f" />
        </mesh>
      ))}

      {cena.objetos.map((objeto) => (
        <ObjetoDoJogo
          key={objeto.idJogo}
          objeto={objeto}
          label={contexto.jogosPorId.get(objeto.idJogo)?.nome ?? objeto.idJogo}
          emFoco={objeto.idJogo === idEmFoco}
          aoEntrar={() => setIdEmFoco(objeto.idJogo)}
          aoSair={() => setIdEmFoco((atual) => (atual === objeto.idJogo ? null : atual))}
          aoClicar={() => aoClicarJogo(objeto.idJogo)}
        />
      ))}

      {cena.naoAlocados.map((naoAlocado) => (
        <mesh key={naoAlocado.idJogo} position={naoAlocado.posicaoXYZ}>
          <boxGeometry args={[0.04, 0.2, 0.2]} />
          <meshStandardMaterial color="#a8adb3" />
        </mesh>
      ))}
    </Canvas>
  )
}

function ObjetoDoJogo({
  objeto,
  label,
  emFoco,
  aoEntrar,
  aoSair,
  aoClicar,
}: {
  objeto: ObjetoNaCena
  label: string
  emFoco: boolean
  aoEntrar: () => void
  aoSair: () => void
  aoClicar: () => void
}) {
  return (
    <mesh
      position={objeto.posicaoXYZ}
      onPointerOver={aoEntrar}
      onPointerOut={aoSair}
      onClick={aoClicar}
    >
      <boxGeometry args={objeto.dimensoesXYZ as [number, number, number]} />
      <meshStandardMaterial color={objeto.cor} />
      {objeto.tracejado && <Edges color="#333" />}
      {emFoco && <Html center>{label}</Html>}
    </mesh>
  )
}
