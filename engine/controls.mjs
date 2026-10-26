import {clamp} from './simulation.mjs';
export class PointerIntent {
  constructor(){this.release();}
  down(id,x,y,now){if(this.active)return false;this.active=true;this.id=id;this.x=x;this.y=y;this.started=now;this.steer=0;this.moved=false;return true;}
  move(id,x,y){if(!this.active||id!==this.id)return;this.steer=clamp((x-this.x)/85,-1,1);this.moved ||= Math.hypot(x-this.x,y-this.y)>9;}
  sample(now){return {steer:this.active?this.steer:0,pedal:this.active&&now-this.started>=170};}
  up(id,now){if(!this.active||id!==this.id)return false;const tap=!this.moved&&now-this.started<230;this.release();return tap;}
  release(){this.active=false;this.id=null;this.steer=0;this.started=0;this.moved=false;}
}
