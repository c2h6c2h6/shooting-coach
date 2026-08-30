import { CoachingObjective, CoachingOutcome } from "./coachingTypes";
import { NumericDifference, SeriesComparison } from "./seriesComparison";
const objectiveMetrics:Record<CoachingObjective,Array<keyof SeriesComparison["differences"]>>={
 dispersion:["meanRadius","extremeSpread","spreadWidth","spreadHeight"],centering:["centroidDistanceToTargetCenter"],
 horizontal_stability:["spreadWidth","horizontalOffset"],vertical_stability:["spreadHeight","verticalOffset"],
 consistency:["meanRadius","extremeSpread"],
};
function directionalOffsetKey(objective:CoachingObjective){
 return objective==="horizontal_stability"?"horizontalOffset":objective==="vertical_stability"?"verticalOffset":null;
}
export function evaluateCoachingOutcome(comparison:SeriesComparison,objective:CoachingObjective):CoachingOutcome{
 if(comparison.status==="not_comparable")return"insufficient_data";
 const offsetKey=directionalOffsetKey(objective),offset=offsetKey?comparison.differences[offsetKey]:undefined;
 // Un franchissement de l'axe reste un résultat mixte : la magnitude peut diminuer,
 // mais la direction du biais change et ne permet pas de conclure à une amélioration stable.
 const crossedAxis=Boolean(offset&&offset.variation==="notable"&&offset.baselineValue*offset.comparedValue<0);
 const values=objectiveMetrics[objective].map(k=>{
  const value=comparison.differences[k] as NumericDifference|undefined;if(!value)return undefined;
  if(k!==offsetKey)return value;
  const delta=Math.abs(value.comparedValue)-Math.abs(value.baselineValue);
  return{...value,delta,relativePercent:Math.abs(value.baselineValue)>.001
   ?delta/Math.abs(value.baselineValue)*100:null};
 }).filter(Boolean) as NumericDifference[];
 if(!values.length)return"insufficient_data";
 const notable=values.filter(v=>v.variation==="notable");if(!notable.length)return"objective_stable";
 const improved=notable.filter(v=>v.delta<0).length,worsened=notable.filter(v=>v.delta>0).length;
 if(crossedAxis)return"mixed_result";
 if(improved&&worsened)return"mixed_result";if(improved)return"objective_improved";if(worsened)return"objective_worsened";
 return"objective_stable";
}
export const coachingOutcomeText:Record<CoachingOutcome,string>={
 objective_improved:"Le résultat est compatible avec un effet positif de l’exercice. Une nouvelle série peut être nécessaire pour vérifier la reproductibilité.",
 objective_stable:"L’objectif choisi est resté globalement stable.",
 objective_worsened:"L’objectif choisi s’est dégradé. Arrêtez cet exercice et revenez à une série simple ou demandez l’aide d’un instructeur.",
 mixed_result:"Les mesures liées à l’objectif évoluent dans des directions différentes.",
 insufficient_data:"Les données ne permettent pas d’évaluer l’objectif choisi.",
};
