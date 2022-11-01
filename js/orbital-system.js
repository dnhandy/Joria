export class OrbitalSystem {
  constructor(json, canvas, context = null, offset = 0){
    this.subscriptions = []
    this.canvas = canvas;
    this.context = context || canvas.getContext("2d");
    
    this.name = json.name;
    this.color = json.color;
    this.size = +json.size;
    this.orbit = +( json.orbit || 0 );
    this.offset = +(json.offset || offset);
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
    this.position = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

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


  redraw( date ) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.redrawSystem( date );
  }

  redrawChildren( minAngle, maxAngle, date ) {
    var orbitRadius = this.size;
    for( var i = 0; i < this.children.length; i++ ) {
      var child = this.children[i];
      orbitRadius += ( child.treeSize() - 1 ) * child.size + this.size;

      if( this.doShowPath ) {
        this.context.beginPath();
        this.context.ellipse(
          this.position.x,
          this.position.y,
          orbitRadius,
          orbitRadius * Math.cos(child.orbitalIncline),
          minAngle,
          maxAngle,
          false);
        this.context.lineWidth = 1;
        this.context.strokeStyle = '#FFFFFF';
        this.context.stroke();
      }

      var angle = 2 * Math.PI * ( (date - child.offset) % child.orbit ) / child.orbit;

      if( angle < 0 ){
        angle = ( angle + 2 * Math.PI );
      }

      if( minAngle <= angle && angle < maxAngle ){        
        child.position.x = this.position.x + orbitRadius * Math.cos(angle);
        child.position.y = this.position.y + orbitRadius * Math.sin(angle) * Math.cos(child.orbitalIncline);
        child.redrawSystem( date );
      }

      orbitRadius += (child.treeSize() - 1) * child.size + this.size * Math.min(child.treeSize() - 1, 1);
    }
  }

  redrawSystem( date ) {
    // TODO: Deal with elliptical orbits. See "eccentricity" and "procession" in Onid's data

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
      var startX = this.position.x + ( this.size + 5 )  * Math.cos(this.rotationAngle );
      var endX   = this.position.x + ( this.size + 10 ) * Math.cos(this.rotationAngle );
      var startY = this.position.y - ( this.size + 5 )  * Math.sin(this.rotationAngle ) * Math.cos( this.rotationalIncline );
      var endY   = this.position.y - ( this.size + 10 ) * Math.sin(this.rotationAngle ) * Math.cos( this.rotationalIncline );

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
}
