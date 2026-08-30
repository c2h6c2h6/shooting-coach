import { describe,expect,it } from "vitest";
import { loadPedagogicalReferenceABV1 } from "./catalogs/pedagogical-reference-ab-v1";
import { normalizeHistoricalGripCompetenceId } from "./b123GripCompetenceCompatibility";

describe("consolidation B1/B2/B3 en compétence de prise fonctionnelle",()=>{
 const catalog=loadPedagogicalReferenceABV1();

 it("conserve B3 comme unique compétence canonique de construction de la prise",()=>{
  expect(catalog.competences.filter(item=>["B1","B2","B3"].includes(item.code)).map(item=>item.code))
   .toEqual(["B3"]);
  expect(catalog.competences.find(item=>item.code==="B3")).toMatchObject({
   name:"Construire une prise fonctionnelle à deux mains",prerequisiteIds:[],
   internalComponents:[
    {code:"B3.1",description:"installer la main forte"},
    {code:"B3.2",description:"installer la main support"},
    {code:"B3.3",description:"assembler les deux mains en une unité fonctionnelle"},
   ],
  });
 });

 it.each(["competence:B1","competence:B2","competence:B3"])("normalise %s vers la compétence canonique",id=>{
  expect(normalizeHistoricalGripCompetenceId(id)).toBe("competence:B3");
 });

 it("conserve B4 distincte et directement dépendante de la prise fonctionnelle",()=>{
  expect(catalog.competences.find(item=>item.code==="B4")?.prerequisiteIds).toEqual(["competence:B3"]);
 });

 it("retire les anciens identifiants des prérequis actifs",()=>{
  expect(catalog.competences.flatMap(item=>item.prerequisiteIds)).not.toEqual(expect.arrayContaining([
   "competence:B1","competence:B2",
  ]));
 });

 it("ne modifie ni B4 ni ses objets d’intervention",()=>{
  expect(catalog.techniques.find(item=>item.code==="TECH-B4-01")).toBeDefined();
  expect(catalog.exercises.find(item=>item.code==="EX-B4-01")).toBeDefined();
 });
});
