//
// SAGE2 application: tennis
// by: takuya shizukuishi <sititou70@gmail.com>
//
// Copyright (c) 2015
//

"use strict";

/* global  */
class XorShift {
  constructor(seed = 88675123) {
    this.x = 123456789;
    this.y = 362436069;
    this.z = 521288629;
    this.w = seed;
    this.seed = seed;
  }

  init() {
    this.x = 123456789;
    this.y = 362436069;
    this.z = 521288629;
    this.w = this.seed;
    this.seed = this.seed;
  }

  // XorShift
  next() {
    let t;
 
    t = this.x ^ (this.x << 11);
    this.x = this.y; this.y = this.z; this.z = this.w;
    return this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8)); 
  }

  serialize(){
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      w: this.w,
      seed: this.seed,
    };
  }

  setState(state){
    this.x = state.x;
    this.y = state.y;
    this.z = state.z;
    this.w = state.w;
    this.seed = state.seed;
  }
}

const xor_shift = new XorShift();
Math.random = (() => {
  const number_range = 1000;
  return () => Math.abs(xor_shift.next()) % number_range / number_range;
})();

//basic classes
class Point{
  constructor(x, y){
    this.x = x;
    this.y = y;
  }

  clone(){
    return new Point(this.x, this.y);
  }

  add(point){
    this.x += point.x;
    this.y += point.y;
    return this;
  }

  serialize(){
    return {
      x: this.x,
      y: this.y,
    };
  }

  setState(state){
    this.x = state.x;
    this.y = state.y;
  }
}

const Vector = Point;

class Bar{
  constructor(initial_position, length, speed, thickness){
    this.position = initial_position;
    this.length = length;
    this.speed = speed;
    this.score = 0;
    this.thickness = thickness;
  }

  draw(canvas_context){
    canvas_context.fillRect(this.position.x + this.thickness, this.position.y - this.length / 2, this.thickness * -1, this.length);
    return this;
  }

  serialize(){
    return {
      position: this.position.serialize(),
      speed: this.speed,
      score: this.score,
    };
  }

  setState(state){
    this.position.setState(state.position);
    this.speed = state.speed;
    this.score = state.score;
  }
}

class Ball{
  constructor(initial_position, r, speed){
    this.position = initial_position;
    this.r = r;
    this.speed = speed;
  }

  getNextSpeed(bars){
    const new_speed = this.speed.clone();
    const next_position = this.position.clone().add(this.speed);

    if(next_position.y - this.r < 0 || next_position.y + this.r > height)new_speed.y *= -1;

    for(const bar of bars){
      const included = Math.abs(next_position.y - bar.position.y) < bar.length / 2;
      const right_straddled = (bar.position.x - (this.position.x + this.r)) * (bar.position.x - (next_position.x + this.r)) < 0;
      const left_straddled = (bar.position.x - (this.position.x - this.r)) * (bar.position.x - (next_position.x - this.r)) < 0;
      const straddled = right_straddled || left_straddled;
      if(included && straddled){
        const harf_width = width / 2;
        const left_pos_and_speed = this.position.x < harf_width && this.speed.x < 0;
        const right_pos_and_speed = this.position.x > harf_width && this.speed.x > 0;
        if(left_pos_and_speed || right_pos_and_speed)new_speed.x *= -1;
      }
    }

    return new_speed;
  }

  move(bars){
    this.speed = this.getNextSpeed(bars);
    this.position.add(this.speed);
    return this;
  }

  draw(canvas_context){
    canvas_context.beginPath();
    canvas_context.fillRect(this.position.x - this.r, this.position.y - this.r, this.r, this.r);
    return this;
  }

  serialize(){
    return {
      position: this.position.serialize(),
      speed: this.speed.serialize(),
    };
  }

  setState(state){
    this.position.setState(state.position);
    this.speed.setState(state.speed);
  }
}

//game
let width;
let height;
let interval_id = undefined;
let canvas;
let canvas_context;

let players_bar;
let opponents_bar;
let ball;
let sync_clock_timer_id;

const init_ball = () => {
  const ball_dx = (7 + Math.random() * 3) * (Math.random() < 0.5 ? 1 : -1);
  const ball_dy = (7 + Math.random() * 5) * (Math.random() < 0.5 ? 1 : -1);
  ball = new Ball(new Point(width / 2, height / 2), 10, new Vector(ball_dx, ball_dy));
};

const init_bar = () => {
  const bars_thickness = 10;
  const bars_margin = 20;
  const bars_length = 100;
  players_bar = new Bar(new Point(bars_margin + bars_thickness, height / 2), bars_length, 20, bars_thickness * -1);
  opponents_bar = new Bar(new Point(width - (bars_margin + bars_thickness), height / 2), bars_length, 5, bars_thickness);
};

const init_game = () => {
  canvas_context.font = "30px serif";
  clearInterval(interval_id);
  interval_id = setInterval(() => step(canvas_context), 1000 / 24);

  set_world_size(canvas);
  
  init_ball();
  init_bar();
};

const set_world_size = (canvas) => {
  width = canvas.width;
  height = canvas.height;
};

const step = (canvas_context) => {
  //calc
  ball.move([players_bar, opponents_bar]);
  if(ball.position.x > width){
    players_bar.score++;
    init_ball();
  }
  if(ball.position.x < 0){
    opponents_bar.score++;
    init_ball();
  }

  //ai
  if(Math.random() < 0.4)opponents_bar.position.y += (ball.position.y - opponents_bar.position.y) * 0.3 + (Math.random() * 6 - 12);

  //draw
  draw(canvas_context);
};

const draw = (canvas_context) => {
  canvas_context.fillStyle = "#000";
  canvas_context.fillRect(0, 0, width, height);

  canvas_context.fillStyle = "#fff";
  ball.draw(canvas_context);
  players_bar.draw(canvas_context);
  opponents_bar.draw(canvas_context);

  const score_margin = 50;
  canvas_context.fillText(players_bar.score, score_margin, score_margin);
  canvas_context.fillText(opponents_bar.score, width - score_margin, score_margin);
};

//sage app
var tennis = SAGE2_App.extend({
  init: function(data) {
    // Create canvas
    this.SAGE2Init("canvas", data);

    // move and resize callbacks
    this.resizeEvents = "continuous"; // onfinish
    // this.moveEvents   = "continuous";

    // SAGE2 Application Settings
    //
    // Control the frame rate for an animation application
    this.maxFPS = 2.0;
    // Not adding controls but making the default buttons available
    this.controls.finishedAddingControls();
    this.enableControls = true;

    //export canvas
    canvas = this.element;
    canvas_context = canvas.getContext("2d");

    init_game();

    //start sync clock
    if(clientID === 0)sync_clock_timer_id = setInterval(() => broadcast({
      app: this.div.id,
      func: "sync",
      data: {
        opponents_bar: opponents_bar.serialize(),
        ball: ball.serialize(),
        xor_shift: xor_shift.serialize(),
      }
    }), 3000);
  },

  load: function(date) {
    console.log('tennis> Load with state value', this.state.value);
    this.refresh(date);
},

  draw: function(date) {
    console.log('tennis> Draw with state value', this.state.value);
  },

  resize: function(date) {
    // Called when window is resized
    this.refresh(date);
    set_world_size(this.element);
  },

  move: function(date) {
    // Called when window is moved (set moveEvents to continuous)
    this.refresh(date);
  },

  quit: function() {
    // Make sure to delete stuff (timers, ...)
    clearInterval(interval_id);
    clearInterval(sync_clock_timer_id);
  },

  sync: function(data) {
    if(clientID === 0)return;
    console.log("sync", data);
    opponents_bar.setState(data.opponents_bar);
    ball.setState(data.ball);
    xor_shift.setState(data.xor_shift);
  },

  event: function(eventType, position, user_id, data, date) {
    if(position !== undefined)players_bar.position.y = position.y;
    if(data.state === "down"){
      console.log("keydown", data.code);
      if(data.code === 66){
        // b
        init_ball();
        this.refresh(date);
      }

      if(data.code === 73){
        // i
        init_game();
        XorShift.init();
        this.refresh(date);
      }
    }
  }
});

