import { describe, expect, it } from "vitest";
import type { Database, SqlParameter } from "../database/types";
import type { CoachingCycle, ConfirmationTestRun } from "../../domain/coachingTypes";
import { SqliteCoachingRepository } from "./sqliteCoachingRepository";
import { SqliteTechnicalHypothesisRepository } from "../hypotheses/sqliteTechnicalHypothesisRepository";
import type { TechnicalHypothesis } from "../../domain/technicalHypothesis";

const timestamp="2026-08-27T00:00:00.000Z";
const cycle:CoachingCycle={id:"legacy-cycle",sessionId:"session",sourceSeriesId:"series",
  hypothesisId:"legacy-unbalanced",confirmationTestRunId:"legacy-grip-test",recommendationId:null,
  drillCode:null,controlSeriesId:null,status:"test_completed",outcome:null,objective:null,startedAt:timestamp,
  completedAt:null,invalidatedAt:null,invalidationReason:null,rulesetVersion:"coaching-rules-v1"};
const run:ConfirmationTestRun={id:"legacy-grip-test",sessionId:"session",sourceSeriesId:"series",
  hypothesisId:"legacy-unbalanced",testCode:"TEST_GRIP_CONSTANCY",status:"completed",startedAt:timestamp,
  completedAt:timestamp,outcome:"supports_hypothesis",observations:["Pression variable"],userAnswers:{},
  confidenceBefore:"low",confidenceAfter:"low",hypothesisStatusBefore:"requires_confirmation",
  hypothesisStatusAfter:"strengthened",generatedSeriesId:null,rulesetVersion:"coaching-rules-v1"};

class HistoryDatabase implements Database {
  async execAsync(_sql:string){}
  async withTransactionAsync(task:()=>Promise<void>){await task();}
  async runAsync(_sql:string,..._params:SqlParameter[]){return{changes:0};}
  async getAllAsync<T>(sql:string){return(sql.includes("FROM coaching_cycles")
    ?[{result_json:JSON.stringify(cycle)}]:[]) as T[];}
  async getFirstAsync<T>(sql:string){
    if(sql.includes("FROM confirmation_test_runs WHERE id"))return{result_json:JSON.stringify(run)} as T;
    return null;
  }
}

describe("historique UNBALANCED_HAND_PRESSURE + TEST_GRIP_CONSTANCY",()=>{
  it("reste lisible comme décision historique de l’ancien ruleset",async()=>{
    const active=await new SqliteCoachingRepository(new HistoryDatabase()).getActiveCycle("session");
    expect(active?.cycle.id).toBe("legacy-cycle");
    expect(active?.test).toMatchObject({hypothesisId:"legacy-unbalanced",testCode:"TEST_GRIP_CONSTANCY",
      outcome:"supports_hypothesis",hypothesisStatusAfter:"strengthened"});
  });

  it("interprète l’ancien code à la lecture sans réécrire SQLite",async()=>{
    const legacy:TechnicalHypothesis={id:"legacy-unbalanced",sessionId:"session",seriesId:"series",
      comparisonId:null,observationId:"observation",hypothesisCode:"UNBALANCED_HAND_PRESSURE",category:"grip",
      status:"requires_confirmation",plausibilityLevel:"medium",confidenceLevel:"low",rank:2,internalScore:5,
      supportingEvidence:[],contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:2},
      sourceRules:["legacy-rule"],rulesetVersion:"technical-hypothesis-rules-v1",generatedAt:timestamp};
    const writes:string[]=[];
    class LegacyHypothesisDatabase implements Database {
      async execAsync(_sql:string){}
      async withTransactionAsync(task:()=>Promise<void>){await task();}
      async runAsync(sql:string,..._params:SqlParameter[]){writes.push(sql);return{changes:0};}
      async getFirstAsync<T>(sql:string){return(sql.includes("FROM series s JOIN sessions")
        ?{session_id:"session",recorded_shot_count:5,shooter_laterality_snapshot:"right",number_of_hands:2}:null) as T;}
      async getAllAsync<T>(sql:string){return(sql.includes("FROM technical_hypotheses")
        ?[{result_json:JSON.stringify(legacy),latest_outcome:null}]:[]) as T[];}
    }
    const result=await new SqliteTechnicalHypothesisRepository(new LegacyHypothesisDatabase(),()=>"new-id").generateForSeries("series");
    expect(result[0]).toMatchObject({id:"legacy-unbalanced",hypothesisCode:"TWO_HAND_CONTRIBUTION",
      rank:2,internalScore:5,sourceRules:["legacy-rule"]});
    expect(writes).toEqual([]);
  });
});
