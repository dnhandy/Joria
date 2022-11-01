class FantasyLeapPeriod {
  constructor( json = {} ){
    this.every = +json.every;
    if( json.except ){
      this.except = new FantasyLeapPeriod( json.except );
    } else {
      this.except = null;
    }
  }

  matches( year ){
    var isMatch = false;
    if( this.every > 0 ){
      var tmpYear = +year;
      if( tmpYear < 0 ){
        tmpYear = this.every + (tmpYear % this.every);
      }

      isMatch = (tmpYear % this.every == 0);
      if( isMatch && this.except){
        isMatch = !this.except.matches( year );
      }
    }      
    return isMatch;
  }
}
class FantasyLeapRule {
  constructor( json = {} ){
    this.days = json.days;
    this.period = new FantasyLeapPeriod( json.period );
  }

  isLeap( year ){
    return this.period.matches( year );
  }

  leapDays( year ){
    return this.period.matches( year ) ? this.days : 0;
  }
}

export class FantasyMonth {
  constructor( json = {} ){
    this.name = json.name;
    this.days = json.days;
    if( json.leap ){
      this.leap = new FantasyLeapRule( json.leap );
    } else {
      this.leap = null;
    }
  }

  daysInMonth( year ){
    return this.days + ( this.leap ? this.leap.leapDays( year ) : 0 );
  }
}

export class FantasyDate {
  constructor( calendar, year, month, day ){
    this.calendar = calendar;
    this.year = year;
    this.month = month;
    this.day = day;
  }

  valid(){
    return (
      this.year >= this.calendar.originYear &&
      ( this.year != 0 || this.calendar.hasYearZero ) &&
      this.calendar.monthLookup[this.month.name] &&
      this.day > 0 &&
      this.day <= this.month.daysInMonth( this.year )
    );
  }
}

export class FantasyCalendar {
  constructor( json = {} ){
    this.originYear = +json.originYear;
    this.hasYearZero = json.hasYearZero || false;
    this.months = [];
    this.monthLookup = {}
    if( json && json.months ){
      for( var i = 0; i < json.months.length; i++){
        var newMonth = new FantasyMonth( json.months[i] )
        this.months.push( newMonth );
        this.monthLookup[newMonth.name] = newMonth;
      }
    }
  }

  daysInYear( year ){
    var days = 0;
    for(var i = 0; i < this.months.length; i++){
      days += this.months[i].daysInMonth( year );
    }
    return days;
  }

  dateToNumber( date ){
    var dateNum = 0;
    if( date.valid() ){
      for( var i = this.originYear; i < date.year; i++ ){
        if( i != 0 || this.hasYearZero )
        dateNum += this.daysInYear( i );
      }

      for( var i = 0; i < this.months.length; i++){
        if( this.months[i].name == date.month.name ){
          break;
        }
        dateNum += this.months[i].daysInMonth( date.year );
      }

      dateNum += date.day;
    }
    return dateNum;
  }

  numberToDate( dateNum ){
    var remaining = dateNum;
    var year = this.originYear;
    while( remaining > this.daysInYear( year ) ){
      remaining -= this.daysInYear( year );
      year++;
    }

    var i = 0;
    while( remaining > this.months[i].daysInMonth( year ) ){
      remaining -= this.months[i].daysInMonth( year );
      i++;
    }
    return new FantasyDate(this, year, this.months[i], remaining);
  }

  date( year, monthName, day ){
    return new FantasyDate( this, +year, this.monthLookup[monthName], +day );
  }
}