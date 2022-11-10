
export class OrbitalSystem {
  constructor(json, canvas, context = null, offset = 0){
    this.subscriptions = []
    this.canvas = canvas;
    this.context = context || canvas.getContext("2d");
    this.cameraOffset = { x: window.innerWidth/2, y: window.innerHeight/2 }
    this.cameraZoom = 0.1;
    this.initialPinchDistance = null;
    this.lastZoom = this.cameraZoom;
    
    this.name = json.name;
    this.color = json.color;
    this.size = +json.size;
    this.orbit = +( json.orbit || 0 );
    this._eccentricity = +( json.eccentricity || 0 );
    this.procession =  +( json.procession || 0 );
    this.offset = +(json.offset || offset);
    this.currentProcession = 0;
    this.rotationAngle = 0;
    if( this.orbit == 0 ){
      this.orbit = 100;
    }
    this.orbitalIncline = +(json.orbitalIncline || 0) * Math.PI / 180;

    if( json.rotation ){
      this.rotation = +json.rotation;  
    }
    this.rotationalIncline = +(json.rotationalIncline || 0) * Math.PI / 180;

    this.doShowPath = true;
    this.doShowRotation = true;
    this.position = { x: 0 / 2, y: 0 };

    this.children = []
    if(json.children){
      for(var i = 0; i < json.children.length; i++){
        this.children.push( new OrbitalSystem(json.children[i], canvas, context, this.offset) );
      }
    }
  }

  get showPath(){
    return this.doShowPath;
  }

  set showPath( doShowPath){
    this.doShowPath = doShowPath;
    this.children.forEach( function(child){
      child.showPath = doShowPath;
    })
  }

  get showRotation(){
    return this.doShowRotation;
  }

  set showRotation( doShowRotation){
    this.doShowRotation = doShowRotation;
    this.children.forEach( function(child){
      child.showRotation = doShowRotation;
    })
  }

  get origin(){
    return { x: this.canvas.width / 2, y: this.canvas.height / 2 };
  }

  treeSize(){
    var size = 1;
    this.children.forEach(function(child, index) {
      size += child.treeSize();
    })
    return size;
  }

  get eccentricity(){
    return Math.min( this._eccentricity, 0.9999999999); // This avoids a divide-by-zero error
  }

  maxOrbitalDistance(){
    var maxDistance = this.size;
    var nextRadius = this.size;
    for( var i = 0; i < this.children.length; i++ ) {
      var child = this.children[i];
      var orbit = this.getOrbit( child, child.offset + child.orbit / 2, nextRadius );
      nextRadius = orbit.nextRadius;
      maxDistance = Math.max( maxDistance, orbit.majorAxis + this.size + child.maxOrbitalDistance() );
    }
    return maxDistance;
  }

  getOrbit( child, date, lastOrbit = 0 ){
    var orbit = {};

    var baseRadius = lastOrbit + ( child.treeSize() - 1 ) * child.size + this.size;

    orbit.angle = 2 * Math.PI * ( (date - child.offset) % child.orbit ) / child.orbit;
    if( orbit.angle < 0 ){
      orbit.angle = ( orbit.angle + 2 * Math.PI );
    }

    child.currentProcession = child.procession == 0 ? 0 : 2 * Math.PI * ( ( date - child.offset ) % child.procession ) / child.procession;
    orbit.procession = child.currentProcession;
    orbit.majorAxis =  baseRadius / ( 1 - child.eccentricity );
    orbit.minorAxis = Math.sqrt( Math.pow(orbit.majorAxis, 2) * (1 - Math.pow( child.eccentricity, 2 ) ) ) * Math.cos(child.orbitalIncline);
    orbit.radius = orbit.majorAxis * orbit.minorAxis / Math.sqrt( Math.pow( orbit.majorAxis, 2 ) * Math.pow( Math.sin( orbit.angle ), 2 ) + Math.pow( orbit.minorAxis, 2 ) * Math.pow( Math.cos( orbit.angle ), 2 ) )

    orbit.center = {
      x: this.position.x - orbit.majorAxis * child.eccentricity * Math.cos( orbit.procession ),
      y: this.position.y - orbit.majorAxis * child.eccentricity * Math.sin( orbit.procession )
    };    

    // Get the position without procession
    var childX = orbit.center.x + orbit.majorAxis * Math.cos( orbit.angle );
    var childY = orbit.center.y + orbit.minorAxis * Math.sin( orbit.angle );
    orbit.radius = Math.sqrt( Math.pow( childX - orbit.center.x, 2 ) + Math.pow( childY - orbit.center.y, 2 ) );
    var tmpAngle = Math.atan( (childY - orbit.center.y) / (childX - orbit.center.x));
    if( childX < orbit.center.x ){
      tmpAngle = tmpAngle + Math.PI;
    }
    
    // Now, add the procession in
    orbit.position = {
      x: orbit.center.x + orbit.radius * Math.cos( tmpAngle - orbit.procession ),
      y: orbit.center.y + orbit.radius * Math.sin( tmpAngle - orbit.procession )
    }

    orbit.nextRadius = baseRadius + (child.treeSize() - 1) * child.size + this.size * Math.min(child.treeSize() - 1, 1);
    return orbit;
  }

  redraw( date ) {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.context.translate( window.innerWidth / 2, window.innerHeight / 2 )
    this.context.scale( this.cameraZoom, this.cameraZoom)
    this.context.translate( -window.innerWidth / 2 + this.cameraOffset.x, -window.innerHeight / 2 + this.cameraOffset.y )
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.redrawSystem( date );
  }

  redrawChildren( minAngle, maxAngle, date ) {
    var orbitRadius = this.size;
    for( var i = 0; i < this.children.length; i++ ) {
      var child = this.children[i];
      var orbit = this.getOrbit( child, date, orbitRadius );

      if( this.doShowPath ) {
        this.context.beginPath();
        this.context.ellipse(
          orbit.center.x,
          orbit.center.y,
          orbit.majorAxis,
          orbit.minorAxis,
          -orbit.procession,
          minAngle,
          maxAngle,
          false);
        this.context.lineWidth = 1;
        this.context.strokeStyle = '#FFFFFF';
        this.context.stroke();
      }

      if( minAngle <= orbit.angle && orbit.angle < maxAngle ){        
        child.position.x = orbit.position.x;
        child.position.y = orbit.position.y;
        child.redrawSystem( date );
      }

      orbitRadius = orbit.nextRadius;
    }
  }

  redrawSystem( date ) {
    // Redraw "back" children
    this.redrawChildren( 0, Math.PI, date );

    // Redraw this object
    this.context.fillStyle = this.color;
    this.context.beginPath();
    this.context.arc( this.position.x, this.position.y, this.size, 0, 2 * Math.PI, false );
    this.context.fill();

    // We're playing with negatives because the Y-axis in HTML is backward from the coordinate system
    this.rotationAngle = -1 * (Math.PI + 2 * Math.PI * ( (date - this.offset) % this.rotation ) / this.rotation );
    
    if( this.showRotation && this.rotation ){
      var angle = this.rotationAngle - this.currentProcession;
      var startX = this.position.x + ( this.size + 5 )  * Math.cos( angle );
      var endX   = this.position.x + ( this.size + 10 ) * Math.cos( angle );
      var startY = this.position.y - ( this.size + 5 )  * Math.sin( angle ) * Math.cos( this.rotationalIncline );
      var endY   = this.position.y - ( this.size + 10 ) * Math.sin( angle ) * Math.cos( this.rotationalIncline );

      this.context.beginPath();
      this.context.moveTo( startX, startY );
      this.context.lineTo( endX, endY);
      this.context.strokeStyle = "#FF0000";
      this.context.lineWidth = 1;
      this.context.stroke();
    }

    // Redraw "front" children
    this.redrawChildren( Math.PI, 2 * Math.PI, date );

    // Alert any subscribers
    for( var i = 0; i < this.subscriptions.length; i++ ){
      this.subscriptions[i]( this );
    }
  }

  subscribe(name, callback){
    if(name == this.name){
      this.subscriptions.push( callback );
    }

    for( var i = 0; i < this.children.length; i++ ){
      this.children[i].subscribe( name, callback );
    }
  }

  clearSubscriptions(){
    this.subscriptions = [];
    for( var i = 0; i < this.children.length; i++ ){
      this.children[i].clearSubscriptions();
    }
  }
}
