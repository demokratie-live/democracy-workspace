import DipAPI from './DipAPI'
import { Vorgang, Vorgangsposition, Drucksache, Plenarprotokoll, Beschlussfassung } from './dip-types'
import { ProceduresArgs } from './types'
import { UserInputError } from 'apollo-server'

const germanDateFormat = new Intl.DateTimeFormat('de-DE', {
  year: 'numeric', month: '2-digit', day: '2-digit'
})

export default {
  PageInfo: {
    startCursor: () =>  '*',
  },
  Plenum: {
   editor: (dok: Plenarprotokoll) => dok.herausgeber,
   number: (dok: Plenarprotokoll) => dok.dokumentnummer,
   link: (dok: Plenarprotokoll) => dok.pdf_url,
   pages: (dok: Plenarprotokoll) => `${dok.anfangsseite} - ${dok.endseite}`,
  },
  Document: {
   editor: (dok: Drucksache) => dok.herausgeber,
   number: (dok: Drucksache) => dok.dokumentnummer,
   type: (dok: Drucksache) => dok.drucksachetyp,
   url: (dok: Drucksache) => dok.pdf_url,
  },
  ProcessFlow: {
    initiator: (vp: Vorgangsposition) => {
      if (!vp.fundstelle.urheber?.length) return vp.vorgangsposition
      return `${vp.vorgangsposition},  Urheber : ${vp.fundstelle.urheber.join(', ')}`
    },
    assignment: (vp: Vorgangsposition) => vp.fundstelle.herausgeber,
    findSpotUrl: (vp: Vorgangsposition) => vp.fundstelle.pdf_url,
    findSpot: (vp: Vorgangsposition) => {
      const { fundstelle } = vp
      const { herausgeber, dokumentart, dokumentnummer } = fundstelle
      const datum = germanDateFormat.format(new Date(fundstelle.datum))
      let result = `${datum} - ${herausgeber}-${dokumentart} ${dokumentnummer}`
      const { anfangsseite, endseite, anfangsquadrant, endquadrant } = fundstelle as Plenarprotokoll
      if(![anfangsseite, endseite, anfangsquadrant, endquadrant].every(Boolean)) return result
      return `${result}, S. ${anfangsseite}${anfangsquadrant} - ${endseite}${endquadrant}`
    },
    date: (vp: Vorgangsposition) => new Date(vp.fundstelle.datum).toISOString(),
    decision: (vp: Vorgangsposition) => {
      return vp.beschlussfassung
    },
  },
  Decision: {
    page: (bf: Beschlussfassung) => bf.seite,
    tenor: (bf: Beschlussfassung) => bf.beschlusstenor,
    document: (bf: Beschlussfassung) => bf.dokumentnummer,
    type: (bf: Beschlussfassung) => bf.abstimmungsart,
    comment: (bf: Beschlussfassung) => bf.abstimm_ergebnis_bemerkung,
    foundation: (bf: Beschlussfassung) => bf.grundlage,
    majority: (bf: Beschlussfassung) => bf.mehrheit,
  },
  Procedure: {
    procedureId: (vorgang: Vorgang) => vorgang.id,
    tags: (vorgang: Vorgang) =>  vorgang.deskriptor?.map((d) => d.name),
    title: (vorgang: Vorgang) => vorgang.titel,
    type: (vorgang: Vorgang) => vorgang.typ,
    currentStatus: (vorgang: Vorgang) => vorgang.beratungsstand,
    period: (vorgang: Vorgang) => vorgang.wahlperiode,
    subjectGroups: (vorgang: Vorgang) => vorgang.sachgebiet,
    date: (vorgang: Vorgang) => vorgang.datum,
    plenums: (vorgang: Vorgang, _args: any, { dataSources: { dipAPI } }: { dataSources: { dipAPI: DipAPI } }) => {
      return dipAPI.getVorgangsPlenarProtokolle(vorgang.id)
    },
    importantDocuments: (vorgang: Vorgang, _args: any, { dataSources: { dipAPI } }: { dataSources: { dipAPI: DipAPI } }) => {
      return dipAPI.getVorgangsDrucksachen(vorgang.id)
    },
    gestOrderNumber: (vorgang: Vorgang) => vorgang.gesta,
    legalValidity: (vorgang: Vorgang) => {
      if(!vorgang.inkrafttreten) return []
      return vorgang.inkrafttreten.map(ik => {
        const datum = germanDateFormat.format(new Date(ik.datum))
        return `${datum}${ik.erlaeuterung ? ` (${ik.erlaeuterung})` : ''}`
      })
    },
    history: (vorgang: Vorgang, _args: any, { dataSources: { dipAPI } }: { dataSources: { dipAPI: DipAPI } }) => {
      return dipAPI.getVorgangsVorgangspositionen(vorgang.id)
    }
  },
  Query: {
    procedure: (_parent: any,  args: { id: string }, { dataSources: { dipAPI } }: { dataSources: { dipAPI: DipAPI } }) => {
      return dipAPI.getVorgang(args.id)
    },
    procedures: (_parent: any, args: ProceduresArgs, { dataSources: { dipAPI } }: { dataSources: { dipAPI: DipAPI } }) => {
      if(args.limit % 50 !== 0) throw new UserInputError('DIP has a fixed page size of 50. Make sure your limt is a multiple of 50 to avoid inconsistencies with cursor based pagination.')
      return dipAPI.getVorgaenge(args)
    }
  }
}
