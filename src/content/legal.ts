/**
 * Legal documents — Terms of Use and Privacy Policy.
 *
 * Original, LGPD-aware copy tailored to what this site actually does (a restaurant
 * site with a contact lead form persisted to PostgreSQL). The controller's
 * corporate data below must come from the restaurant's registration record.
 *
 * Commercial/identifying data is wrapped in `**…**`, which the renderer
 * (`legal-document.tsx`) turns into bold. Keep this as the single source of truth;
 * the `/privacidade` and `/termos` pages and their metadata read from here. Update
 * `updated` whenever the text changes.
 *
 * ⚠️ NÃO PUBLICAR ENQUANTO HOUVER `PENDENTE_*` ABAIXO. Estes documentos são a base
 * legal do tratamento de dados (LGPD): publicar com o dado de outra empresa é pior
 * do que publicar em branco, por isso o campo que falta está marcado em vez de
 * preenchido por aproximação. **Só falta o domínio final** — ainda não comprado.
 *
 * Razão social, CNPJ, endereço, CEP e e-mail vieram do cliente em 17/08/2026; os
 * dígitos verificadores do CNPJ foram conferidos. Esses dados também vivem em
 * `src/config/site.ts` (`legalName`, `registration`, `contact.email`), que alimenta
 * o rodapé e o structured data — os dois arquivos precisam concordar.
 */

/** Marca um dado que ainda não foi fornecido pelo cliente. Nunca inventar. */
const PENDENTE = (campo: string) => `«PENDENTE: ${campo}»`;

/** Controller (data + legal entity) — used across both documents. */
export const legalEntity = {
  legalName: "PRATO COFFEE SHOP REFEICOES LTDA",
  tradeName: "Restaurante Prato",
  cnpj: "03.354.096/0001-84",
  address: "R. Augusto Severo, nº 25 — Centro, CEP 11010-050, Santos/SP, Brasil",
  // Sem telefone fixo: o único canal de voz/mensagem é o WhatsApp, que já consta
  // no site. Os documentos legais passam a apontar só para o e-mail.
  email: "pratocoffee@gmail.com",
  // Mesmo endereço do contato geral: o restaurante não tem um encarregado de
  // dados separado, e apontar a LGPD para uma caixa que ninguém lê seria pior.
  privacyEmail: "pratocoffee@gmail.com",
  site: PENDENTE("domínio final do site"),
} as const;

/** O prefixo que `PENDENTE()` escreve — reconhecer o valor exige reconhecê-lo. */
const MARCA_PENDENTE = "«PENDENTE:";

/**
 * Campos do cliente que ainda não chegaram.
 *
 * Recebe a entidade por parâmetro (com a real por padrão) para poder ser
 * testada de verdade: uma função que só sabe ler uma constante do módulo só
 * pode ser testada contra o estado de hoje.
 */
export function pendenciasLegais(
  entidade: Record<string, string> = legalEntity,
): string[] {
  return Object.entries(entidade)
    .filter(([, valor]) => typeof valor === "string" && valor.includes(MARCA_PENDENTE))
    .map(([campo]) => campo);
}

/**
 * Por que o site não pode abrir aos buscadores — ou `null` quando pode.
 *
 * O aviso de não publicar com pendência existia como comentário no topo deste
 * arquivo, e comentário não impede nada. Isto impede: `src/lib/env.ts` chama
 * esta função e derruba a construção do site em vez de deixar subir uma página
 * indexada com documento de LGPD incompleto.
 *
 * Errar aqui não custa retrabalho, custa retirada: página indexada leva semanas
 * para sair do índice, e nesse meio-tempo ela é o documento legal do cliente.
 */
export function impedimentoParaIndexar(
  indexavel: boolean,
  pendencias: string[],
): string | null {
  if (!indexavel || pendencias.length === 0) return null;
  return (
    `SITE_INDEXABLE=true, mas src/content/legal.ts ainda tem dado do cliente ` +
    `pendente: ${pendencias.join(", ")}. Abrir o site aos buscadores assim ` +
    `publica um documento de LGPD incompleto, e tirar uma página do índice ` +
    `leva semanas. Preencha o dado ou mantenha SITE_INDEXABLE=false.`
  );
}

export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = {
  title: string;
  /** Human-readable "last updated" date shown under the title. */
  updated: string;
  intro: string[];
  sections: LegalSection[];
};

const e = legalEntity;

/** Bolded forms of the commercial data, reused across the copy. */
const b = {
  legalName: `**${e.legalName}**`,
  tradeName: `**${e.tradeName}**`,
  cnpj: `**${e.cnpj}**`,
  address: `**${e.address}**`,
  email: `**${e.email}**`,
  privacyEmail: `**${e.privacyEmail}**`,
  site: `**${e.site}**`,
};

const pt: { terms: LegalDoc; privacy: LegalDoc } = {
  terms: {
    title: "Termos de Uso",
    updated: "Última atualização: 17 de agosto de 2026",
    intro: [
      `Estes Termos de Uso ("Termos") regulam o acesso e a utilização do site ${b.site} ("Site"), mantido por ${b.legalName}, nome fantasia ${b.tradeName}, inscrita no CNPJ sob o nº ${b.cnpj}, com sede em ${b.address} ("nós", "nosso" ou "Empresa").`,
      "Ao acessar ou utilizar o Site, você ('Usuário') declara ter lido, compreendido e concordado integralmente com estes Termos. Caso não concorde com qualquer disposição, pedimos que não utilize o Site.",
    ],
    sections: [
      {
        heading: "1. Definições",
        body: [
          "Para os fins destes Termos, considera-se:",
          "(a) Site: o endereço eletrônico, suas páginas e funcionalidades, mantido pela Empresa;",
          "(b) Usuário: qualquer pessoa que acesse ou utilize o Site;",
          "(c) Conteúdo: todo material disponibilizado no Site, incluindo textos, imagens, logotipos, marcas, layout e código;",
          "(d) Empresa: a pessoa jurídica identificada acima, responsável pelo Site.",
        ],
      },
      {
        heading: "2. Objeto",
        body: [
          "O Site tem caráter institucional e informativo, destinando-se a apresentar o restaurante, sua gastronomia, seu ambiente, seus horários de funcionamento e sua localização, bem como a disponibilizar canais de contato e de solicitação de reserva.",
          "O Site não comercializa produtos ou serviços diretamente nem realiza transações financeiras. Pedidos, reservas e consumo ocorrem presencialmente ou pelos canais de atendimento indicados.",
        ],
      },
      {
        heading: "3. Aceitação dos Termos",
        body: [
          "A utilização do Site implica a aceitação integral destes Termos e da nossa Política de Privacidade. Se você utilizar o Site em nome de uma pessoa jurídica, declara possuir poderes para vinculá-la a estes Termos.",
          "Caso não concorde com qualquer condição aqui prevista, você deverá interromper imediatamente o uso do Site.",
        ],
      },
      {
        heading: "4. Capacidade e veracidade das informações",
        body: [
          "O Usuário declara ser plenamente capaz, nos termos da legislação civil, para utilizar o Site e enviar informações por meio dele.",
          "O Usuário é o único responsável pela veracidade, exatidão e atualização das informações que fornece, respondendo por eventuais danos decorrentes de informações falsas, incorretas ou desatualizadas.",
        ],
      },
      {
        heading: "5. Condições e regras de uso",
        body: [
          "O Usuário se compromete a utilizar o Site de forma lícita, ética e de acordo com a legislação aplicável, abstendo-se de praticar atos que possam prejudicar a Empresa, outros usuários ou terceiros.",
          "É vedado, a título exemplificativo: (a) tentar obter acesso não autorizado a sistemas, contas ou áreas restritas; (b) interferir no funcionamento do Site ou introduzir códigos maliciosos; (c) utilizar mecanismos automatizados para extração massiva de dados (scraping); e (d) reproduzir, distribuir ou explorar comercialmente o Conteúdo sem autorização.",
        ],
      },
      {
        heading: "6. Envio de informações pelo formulário de contato",
        body: [
          "O Site disponibiliza um formulário de contato. Ao enviá-lo, o Usuário declara que as informações fornecidas são verdadeiras, completas e atualizadas, e que possui autorização para compartilhá-las.",
          "As informações enviadas são tratadas conforme a nossa Política de Privacidade. O envio de uma mensagem não gera, por si só, qualquer obrigação de resposta, de reserva ou de atendimento por parte da Empresa. Solicitações de reserva feitas por WhatsApp só se confirmam mediante retorno do restaurante.",
        ],
      },
      {
        heading: "7. Propriedade intelectual",
        body: [
          "Todo o Conteúdo do Site é de titularidade da Empresa ou de seus licenciadores e é protegido pela legislação de propriedade intelectual, incluindo direitos autorais e de marcas.",
          "É proibida a cópia, modificação, reprodução, publicação ou qualquer outra forma de utilização do Conteúdo sem autorização prévia e por escrito da Empresa, ressalvado o uso pessoal e não comercial inerente à navegação.",
          "As marcas, logotipos e nomes empresariais exibidos no Site não podem ser utilizados sem o consentimento expresso de seus respectivos titulares.",
        ],
      },
      {
        heading: "8. Links e serviços de terceiros",
        body: [
          "O Site pode conter links para sites e serviços de terceiros (por exemplo, redes sociais e aplicativos de mensagens). Tais links são fornecidos por conveniência e não implicam endosso.",
          "A Empresa não se responsabiliza pelo conteúdo, pelas práticas de privacidade ou pelo funcionamento desses sites e serviços, cujo acesso ocorre por conta e risco do Usuário.",
        ],
      },
      {
        heading: "9. Privacidade e proteção de dados",
        body: [
          "O tratamento de dados pessoais coletados por meio do Site é regido pela nossa Política de Privacidade, parte integrante destes Termos, elaborada em conformidade com a Lei nº 13.709/2018 (LGPD).",
          "Recomendamos a leitura atenta da Política de Privacidade para compreender como os seus dados são coletados, utilizados e protegidos.",
        ],
      },
      {
        heading: "10. Cookies",
        body: [
          "O Site utiliza cookies estritamente necessários ao seu funcionamento e tecnologias de armazenamento de sessão para funcionalidades do Site, incluindo o registro temporário da origem do acesso. Não utilizamos ferramentas de análise de audiência nem cookies de rastreamento. Mais detalhes estão descritos na Política de Privacidade. O Usuário pode gerenciar cookies nas configurações do seu navegador.",
        ],
      },
      {
        heading: "11. Disponibilidade e isenção de garantias",
        body: [
          "Empenhamo-nos para manter o Site disponível e atualizado, mas ele é fornecido 'no estado em que se encontra', sem garantias de disponibilidade ininterrupta, ausência de erros ou adequação a uma finalidade específica.",
          "Podemos, a qualquer tempo e sem aviso prévio, alterar, suspender ou descontinuar, total ou parcialmente, o Site ou quaisquer de suas funcionalidades, sem que isso gere qualquer obrigação de indenizar.",
        ],
      },
      {
        heading: "12. Limitação de responsabilidade",
        body: [
          "Na máxima extensão permitida pela legislação aplicável, a Empresa não será responsável por danos indiretos, incidentais ou lucros cessantes decorrentes do uso ou da impossibilidade de uso do Site, ou de conteúdos de terceiros acessados a partir dele.",
          "A Empresa não se responsabiliza por falhas decorrentes de caso fortuito, força maior, indisponibilidade de internet ou ações de terceiros alheias ao seu controle.",
        ],
      },
      {
        heading: "13. Comunicações",
        body: [
          `As comunicações entre o Usuário e a Empresa poderão ser realizadas pelos canais oficiais indicados no Site, especialmente o e-mail ${b.email}.`,
        ],
      },
      {
        heading: "14. Alterações destes Termos",
        body: [
          "Podemos atualizar estes Termos periodicamente para refletir mudanças legais, técnicas ou de negócio. A versão vigente será sempre a publicada no Site, com a respectiva data de atualização.",
          "O uso continuado do Site após a publicação de alterações representa concordância com a nova versão.",
        ],
      },
      {
        heading: "15. Disposições gerais",
        body: [
          "A eventual tolerância quanto ao descumprimento de qualquer disposição destes Termos não constituirá renúncia ou novação, podendo a Empresa exigir o cumprimento a qualquer tempo.",
          "Caso qualquer cláusula destes Termos seja considerada inválida ou inexequível, as demais permanecerão em pleno vigor e efeito.",
        ],
      },
      {
        heading: "16. Legislação aplicável e foro",
        body: [
          "Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Santos/SP para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.",
        ],
      },
      {
        heading: "17. Contato",
        body: [
          `Em caso de dúvidas sobre estes Termos, entre em contato com ${b.legalName} (${b.tradeName}) pelo e-mail ${b.email}.`,
        ],
      },
    ],
  },
  privacy: {
    title: "Política de Privacidade",
    updated: "Última atualização: 17 de agosto de 2026",
    intro: [
      `Esta Política de Privacidade descreve como ${b.legalName}, nome fantasia ${b.tradeName}, inscrita no CNPJ nº ${b.cnpj}, com sede em ${b.address} ("nós" ou "Empresa"), coleta, utiliza, armazena e protege os dados pessoais dos usuários do site ${b.site} ("Site").`,
      "O tratamento de dados pessoais é realizado em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD) e demais normas aplicáveis. Ao utilizar o Site, você declara estar ciente desta Política.",
    ],
    sections: [
      {
        heading: "1. Definições",
        body: [
          "Para os fins desta Política, conforme a LGPD, considera-se:",
          "(a) Dado pessoal: informação relacionada a pessoa natural identificada ou identificável;",
          "(b) Titular: a pessoa natural a quem se referem os dados pessoais;",
          "(c) Tratamento: toda operação realizada com dados pessoais, como coleta, uso, armazenamento e eliminação;",
          "(d) Controlador: a quem competem as decisões sobre o tratamento — no caso, a Empresa;",
          "(e) Operador: quem realiza o tratamento em nome do Controlador.",
        ],
      },
      {
        heading: "2. Controlador dos dados",
        body: [
          `O controlador responsável pelo tratamento dos seus dados pessoais é ${b.legalName}, nome fantasia ${b.tradeName}, inscrita no CNPJ nº ${b.cnpj}, com sede em ${b.address}.`,
        ],
      },
      {
        heading: "3. Encarregado e canal de atendimento",
        body: [
          `Para assuntos relativos a dados pessoais e privacidade, bem como para o exercício dos seus direitos, disponibilizamos o canal de atendimento: ${b.privacyEmail}.`,
        ],
      },
      {
        heading: "4. Dados fornecidos por você",
        body: [
          "Formulário de contato: ao utilizá-lo, coletamos nome, e-mail, telefone, empresa (quando informada) e o conteúdo da mensagem.",
          "Reservas por WhatsApp: os botões de reserva do Site abrem uma conversa no WhatsApp com uma mensagem pré-preenchida. A conversa ocorre no aplicativo, sob os termos e a política de privacidade do WhatsApp; o Site não armazena o seu número nem o conteúdo dessa conversa.",
          "Origem do acesso: ao enviar um dos formulários, registramos também informações sobre como você chegou até o Site — por exemplo, a página de entrada, o endereço de referência (site de origem) e eventuais parâmetros de campanha (UTMs) —, com a finalidade de compreender a eficácia dos nossos canais de divulgação e direcionar melhor o atendimento.",
          "Não coletamos intencionalmente dados pessoais sensíveis. Pedimos que você não inclua tais informações nas mensagens enviadas pelos formulários.",
        ],
      },
      {
        heading: "5. Dados coletados automaticamente",
        body: [
          "Durante a navegação, podem ser registrados dados técnicos como endereço IP, tipo de navegador e dispositivo, sistema operacional, páginas acessadas, data e horário de acesso e preferências (por exemplo, idioma), por meio de cookies e tecnologias semelhantes.",
          "Não utilizamos ferramentas de análise de audiência, de publicidade ou de rastreamento de terceiros neste Site.",
          "Para registrar a origem do seu acesso durante a visita (conforme o item 4), utilizamos o armazenamento de sessão (sessionStorage) do navegador, que é apagado ao encerrar a aba ou a sessão — não se trata de cookie de rastreamento persistente.",
          "Esses dados são utilizados de forma agregada para fins de operação, segurança e melhoria do Site.",
        ],
      },
      {
        heading: "6. Finalidades do tratamento",
        body: [
          "Tratamos os seus dados para: (a) responder a contatos e solicitações; (b) organizar reservas e atender pedidos de informação sobre o restaurante; (c) operar, manter, melhorar e proteger o Site; e (d) cumprir obrigações legais ou regulatórias.",
        ],
      },
      {
        heading: "7. Bases legais",
        body: [
          "O tratamento dos seus dados fundamenta-se nas seguintes bases legais previstas na LGPD, conforme o caso: execução de procedimentos preliminares relacionados a solicitação do titular; legítimo interesse da Empresa; cumprimento de obrigação legal ou regulatória; e consentimento do titular, quando aplicável.",
          "Quando o tratamento se basear no consentimento, você poderá revogá-lo a qualquer momento pelos canais indicados nesta Política.",
        ],
      },
      {
        heading: "8. Cookies",
        body: [
          "Utilizamos cookies estritamente necessários ao funcionamento do Site (por exemplo, para lembrar o idioma escolhido e manter sessões de áreas administrativas). Esses cookies são essenciais e não dependem de consentimento.",
          "Além dos cookies necessários, empregamos o armazenamento de sessão (sessionStorage) do seu navegador para fins funcionais — em especial, registrar temporariamente a origem do seu acesso até o envio de um formulário —, o qual é apagado ao encerrar a sessão. Não utilizamos cookies de rastreamento publicitário nem ferramentas de análise de audiência.",
          "Você pode configurar o seu navegador para bloquear ou alertar sobre cookies; contudo, algumas funcionalidades do Site podem deixar de operar corretamente.",
        ],
      },
      {
        heading: "9. Compartilhamento de dados",
        body: [
          "Não vendemos os seus dados pessoais. Podemos compartilhá-los com prestadores de serviço (operadores) que atuam em nosso nome — por exemplo, provedores de hospedagem e de infraestrutura de banco de dados — estritamente para viabilizar o funcionamento do Site, sob obrigações de confidencialidade e segurança.",
          "Também poderemos compartilhar dados quando necessário para cumprir obrigação legal, ordem de autoridade competente ou para o exercício regular de direitos.",
        ],
      },
      {
        heading: "10. Provedores e operadores",
        body: [
          "Para a operação do Site, utilizamos serviços de terceiros, como provedores de hospedagem de aplicação e de banco de dados em nuvem. Esses provedores tratam dados exclusivamente conforme nossas instruções e adotam medidas de segurança próprias.",
        ],
      },
      {
        heading: "11. Armazenamento e transferência internacional",
        body: [
          "Os dados são armazenados em ambiente de banco de dados e em provedores de nuvem contratados pela Empresa. Conforme a infraestrutura utilizada, parte do tratamento pode ocorrer em servidores localizados fora do Brasil.",
          "Nesses casos, adotamos salvaguardas adequadas para assegurar que a transferência internacional observe os requisitos da LGPD e mantenha um nível de proteção compatível.",
        ],
      },
      {
        heading: "12. Segurança da informação",
        body: [
          "Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados pessoais contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda, alteração ou divulgação. Senhas de acesso administrativo, por exemplo, são armazenadas de forma cifrada.",
          "Nenhum sistema é completamente imune a riscos; por isso, trabalhamos continuamente para aprimorar nossas práticas de segurança.",
        ],
      },
      {
        heading: "13. Retenção e eliminação",
        body: [
          "Mantemos os dados pessoais pelo tempo necessário ao cumprimento das finalidades para as quais foram coletados, ou pelo prazo exigido por obrigações legais.",
          "Encerradas as finalidades, os dados são eliminados ou anonimizados, ressalvadas as hipóteses de guarda permitidas pela legislação.",
        ],
      },
      {
        heading: "14. Direitos do titular",
        body: [
          "Nos termos da LGPD, você pode, a qualquer momento, solicitar: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; portabilidade; informação sobre compartilhamentos; e revogação do consentimento, quando esta for a base legal aplicável.",
        ],
      },
      {
        heading: "15. Como exercer seus direitos",
        body: [
          `Para exercer qualquer um dos seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados, entre em contato pelo e-mail ${b.privacyEmail}. Poderemos solicitar informações adicionais para confirmar a sua identidade antes de atender ao pedido.`,
        ],
      },
      {
        heading: "16. Reclamação à autoridade",
        body: [
          "Sem prejuízo do contato direto conosco, o titular tem o direito de peticionar à Autoridade Nacional de Proteção de Dados (ANPD) a respeito do tratamento dos seus dados pessoais.",
        ],
      },
      {
        heading: "17. Privacidade de menores",
        body: [
          "O Site não se destina a menores de 18 anos e não coletamos intencionalmente dados de crianças e adolescentes. Caso identifiquemos tal coleta sem a devida autorização, os dados serão eliminados.",
        ],
      },
      {
        heading: "18. Alterações desta Política",
        body: [
          "Esta Política pode ser atualizada periodicamente. A versão vigente será sempre a publicada no Site, com a respectiva data de atualização. Recomendamos a revisão periódica deste documento.",
        ],
      },
      {
        heading: "19. Contato",
        body: [
          `Dúvidas, solicitações ou reclamações relativas a esta Política e ao tratamento de dados pessoais podem ser encaminhadas a ${b.legalName} (${b.tradeName}) pelo e-mail ${b.privacyEmail}.`,
        ],
      },
    ],
  },
};

export const legalContent: Record<string, { terms: LegalDoc; privacy: LegalDoc }> = {
  pt,
};

/** Resolve the legal documents for a locale, falling back to Portuguese. */
export function getLegal(locale: string) {
  return legalContent[locale] ?? legalContent.pt;
}
