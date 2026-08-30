import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { MvpValidationRepository } from "../application/mvpValidationRepository";
import { getDatabase } from "../infrastructure/database/sqlite";
type DemoState={enabled:boolean;scenarioCode:string|null;loading:boolean;setDemo:(enabled:boolean,scenarioCode?:string|null)=>Promise<void>;reset:()=>Promise<void>};
const Context=createContext<DemoState|null>(null);
export function DemoModeProvider({children}:PropsWithChildren){
 const[enabled,setEnabled]=useState(false),[scenarioCode,setScenario]=useState<string|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{void(async()=>{const x=await new MvpValidationRepository(await getDatabase()).getDemo();setEnabled(Boolean(x.enabled));setScenario(x.loaded_scenario_code);setLoading(false)})()},[]);
 const value=useMemo<DemoState>(()=>({enabled,scenarioCode,loading,
  async setDemo(next,code=null){await new MvpValidationRepository(await getDatabase()).setDemo(next,code);setEnabled(next);setScenario(next?code:null)},
  async reset(){await new MvpValidationRepository(await getDatabase()).resetDemo();setEnabled(false);setScenario(null)}
 }),[enabled,scenarioCode,loading]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDemoMode(){const x=useContext(Context);if(!x)throw new Error("DemoModeProvider absent.");return x}
