// Procedural poses use simulation time, so captures and replay always match.
export const ANIMATIONS=['riding','steering','throwing','sprinting','falling'];
export function poseAt(mode,time,steer=1){
  const sprint=mode==='sprinting',pedal=Math.sin(time*(sprint?17:9));
  const pose={lean:mode==='steering'?steer*.25:0,bodyPitch:sprint?-.15:0,bob:Math.sin(time*9)*(sprint?.035:.015),leftLeg:pedal*.4,rightLeg:-pedal*.4,leftArm:0,rightArm:0,fall:0,wheel:time*(sprint?28:16)};
  if(mode==='throwing'){const t=Math.min(1,time/.5);pose.rightArm=-Math.sin(t*Math.PI)*2.15;pose.bodyPitch=Math.sin(t*Math.PI)*.08;}
  if(mode==='falling'){pose.fall=Math.sin(Math.min(1,time/1.1)*Math.PI)*1.25;pose.leftArm=-.6;pose.rightArm=-.5;pose.leftLeg=.2;pose.rightLeg=-.3;}
  return pose;
}
