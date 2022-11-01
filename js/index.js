import { FantasyCalendar, FantasyDate } from './calendar.js';
import { OrbitalSystem } from './orbital-system.js';

import miiranCalendar from "../data/miiran-calendar.json" assert {type: 'json'};
import joria from "../data/joria.json" assert {type: 'json'};

var system = null;
var calendar = null;

function play(){
  var playButton = document.getElementById("playButton");
  var pauseButton = document.getElementById("pauseButton");
  playButton.enabled = false;
  playButton.style.visibility = 'hidden';
  pauseButton.enabled = true;
  pauseButton.style.visibility = 'visible';

  document.getElementById("yearInput").enabled = false;
  document.getElementById( "monthInput" ).enabled = false;
  document.getElementById("dayOfMonthInput").enabled = false;

  if (window.systemPlayInterval){
    clearInterval(window.systemPlayInterval);
  }

  var playSpeed = 0;

  var playSpeedOptions = document.getElementsByName("playSpeed");
  for(var i = 0; i < playSpeedOptions.length; i++ ) {
    if(playSpeedOptions[i].checked){
      playSpeed = +(playSpeedOptions[i].value);
    }
  };

  window.systemPlayInterval = setInterval(
    function() {
      var dateInput = document.getElementById("dateInput");
      dateInput.value = +(dateInput.value) + playSpeed;

      var date = calendar.numberToDate( Math.round( +(dateInput.value) ) );
      document.getElementById("yearInput").value = date.year;
      var monthSelect = document.getElementById( "monthInput" );
      for(var i = 0; i < monthSelect.options.length; i++){
        if(monthSelect.options[i].value == date.month.name){
          monthSelect.selectedIndex = i;
          break;
        }
      }
      document.getElementById("dayOfMonthInput").value = date.day;
      refresh();
    },
    50
  )
}

function playSpeedChanged(){
  if (window.systemPlayInterval){
    pause();
    play();
  }
}

function pause(){
  var playButton = document.getElementById("playButton");
  var pauseButton = document.getElementById("pauseButton");
  playButton.enabled = true;
  playButton.style.visibility = 'visible';
  pauseButton.enabled = false;
  pauseButton.style.visibility = 'hidden';

  document.getElementById("yearInput").enabled = true;
  document.getElementById( "monthInput" ).enabled = true;
  document.getElementById("dayOfMonthInput").enabled = true;

  if (window.systemPlayInterval){
    clearInterval(window.systemPlayInterval);
    window.systemPlayInterval = null;
  }
}

function refresh(){        
  var dateNum = document.getElementById("dateInput").value;
  system.redraw( dateNum );
}

function setDate(){
  var year = document.getElementById("yearInput").value;
  var monthSelect = document.getElementById( "monthInput" );
  var month = monthSelect.options[monthSelect.selectedIndex].value;
  var day = document.getElementById("dayOfMonthInput").value;
  var date = calendar.date( year, month, day );
  var dateNum = calendar.dateToNumber( date );
  document.getElementById("dateInput").value = dateNum;
  refresh();
}

function setup(){
  document.getElementById("updateButton").addEventListener("click", setDate);
  document.getElementById("showPathInput").addEventListener("change", showPathChanged);
  document.getElementById("showRotationInput").addEventListener("change", showRotationChanged)
  document.getElementById("playButton").addEventListener("click", play);
  document.getElementById("pauseButton").addEventListener("click", pause);
  
  var radioButtons = document.getElementsByName("playSpeed");
  for(var i = 0; i < radioButtons.length; i++){
    radioButtons[i].addEventListener("change", playSpeedChanged);
  }

  var canvas = document.getElementById( "solarSystemCanvas" );
  system = new OrbitalSystem( joria, canvas );

  var canvasSize = system.size * ( system.treeSize() + 3 ) * 2;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  system.position.x = canvasSize / 2;
  system.position.y = canvasSize / 2;

  calendar = new FantasyCalendar( miiranCalendar );
  var monthInput = document.getElementById( "monthInput" );
  for( var i = 0; i < calendar.months.length; i++ ){
    var option = document.createElement('option');
    option.value = calendar.months[i].name;
    option.innerHTML = option.value;
    monthInput.appendChild( option );
  }
  system.subscribe("Cator", updateHUD);
}

function showPathChanged(){
  var showPath = document.getElementById("showPathInput").checked;
  system.showPath = showPath;
  refresh();
}

function showRotationChanged(){
  var showRotation = document.getElementById("showRotationInput").checked;
  system.showRotation = showRotation;
  refresh();
}

function updateHUD ( system ){
  var xPos = system.position.x - system.origin.x;
  // Transpose Y since HTML counts Y coordinates opposite of normal
  var yPos = system.origin.y - system.position.y;
  var orbitalMagnitude = Math.sqrt( Math.pow( xPos, 2 ) + Math.pow( yPos, 2 ) );

  // Add a unit vector in the direction of rotation.
  var rotationX = Math.cos( system.rotationAngle );
  var rotationY = Math.sin( system.rotationAngle );
  var summedVector = { x: xPos + rotationX, y: yPos + rotationY };
  var summedVectorMagnitute = Math.sqrt( Math.pow( summedVector.x, 2 ) + Math.pow( summedVector.y, 2 ) );

  // Compare the summed vector's magnitude to a the what it would be if
  // the orbital and rotational vectors were orthogonal. This will tell us whether they
  // form an acute or obtuse angle, and therefore whether it's day. 
  var rightAngleVectorMagnitude = Math.sqrt( Math.pow( orbitalMagnitude, 2 ) + 1 );

  var topHue = 180;
  var bottomHue = 180;
  var topSaturation = 100;
  var bottomSaturation = 100;
  var direction = "left";
  var lightPercent = 1;

  if( summedVectorMagnitute < rightAngleVectorMagnitude ){
    // It's an acute angle, so it's daylight!
    
    // The shortest resultant vector is if the two vectors are 180 degrees apart.
    // This happens at noon.
    var minMagnitude = orbitalMagnitude - 1;
    var magnitudeVariability = rightAngleVectorMagnitude - minMagnitude;
    var magnitudeRatio = ( rightAngleVectorMagnitude - summedVectorMagnitute ) / magnitudeVariability;
    
    // magnitudeRatio represents a linear "how far from noon is it?" function.
    // Light doesn't raise and lower linearly, though. Put it through a sigmoid function first

    // How "steep" the sigmoid is
    const gain = 20;
    // Where the sigmoid function will be exactly 0.5
    const offset = 0.1;
    
    // HSL gets ugly when light is above 50%
    lightPercent = 50 * ( Math.tanh( gain * (magnitudeRatio - offset ) / 2 ) + 1 ) / 2;
    if( lightPercent < 40 ){
      topHue = 30;
      topSaturation = 100 - lightPercent;
      // TODO: determine whether this is sunrise or sunset, and change the direction accordingly
    }
  }

  var background =
    "linear-gradient(to bottom " + direction +
    ", hsl(" + topHue + ", " + topSaturation + "%, " + lightPercent +
    "%), hsl(" + bottomHue + ", " + bottomSaturation + "%, " + lightPercent + "%))";

  document.getElementById("hud").style.background = background;
}

window.onload = function(){
  setup();
  refresh();
}
