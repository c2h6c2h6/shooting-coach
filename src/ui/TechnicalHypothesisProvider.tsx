import { randomUUID } from "expo-crypto";
import { createContext,PropsWithChildren,useContext,useMemo } from "react";
import { DiagnosticAnswerValue } from "../domain/diagnosticQuestionCatalog";
import { TechnicalHypothesis } from "../domain/technicalHypothesis";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteTechnicalHypothesisRepository } from "../infrastructure/hypotheses/sqliteTechnicalHypothesisRepository";
interface Service{forSeries(id:string):Promise<TechnicalHypothesis[]>;answer(q:string,id:string,v:DiagnosticAnswerValue):Promise<TechnicalHypothesis[]>}
const Context=createContext<Service|null>(null);
export function TechnicalHypothesisProvider({children}:PropsWithChildren){
 const repository=useMemo(()=>getDatabase().then(db=>new SqliteTechnicalHypothesisRepository(db,randomUUID)),[]);
 const value=useMemo<Service>(()=>({forSeries:id=>repository.then(r=>r.generateForSeries(id)),
  async answer(q,id,v){const r=await repository;await r.answer(q,id,v);return r.generateForSeries(id);}}),[repository]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTechnicalHypotheses(){const v=useContext(Context);if(!v)throw new Error("TechnicalHypothesisProvider absent.");return v;}

