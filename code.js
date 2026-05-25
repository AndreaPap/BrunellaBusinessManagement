// VARIABILI DI STATO
    let State_BrunellaLoaded;
    let State_Values;
    let State_Dates;
    let State_Times;
    let State_Resamples;

    // FUNZIONI PILOTA E GENERICHE
    EventInit();

    function ValidateValueDate( InputValue, InputDate, InputTime )
    {
        let TestValue = parseInt( InputValue );
        let TestDate = new Date( InputDate );

        if( !Number.isNaN( TestValue ) && !Number.isNaN( TestDate.getTime() ) && !( InputTime !== 'Morning' && InputTime !=='Afternoon' ) )
        {
            return true;
        }
        else{ return false; }
    }

    document.getElementById( 'InputJson' ).addEventListener( 'change', 
        ( ChangeEvent ) => 
        {
            let Reader = new FileReader();
            Reader.onload = ( EndLoadEvent ) => { EventLoad( JSON.parse( Reader.result ) ); }

            Reader.readAsText( ChangeEvent.target.files[0] ); // parte la lettura che triggera la callback onload
        }
    );

    function InsertClick()
    { 
        EventInsert(
            document.getElementById( "InputPrice" ).value,
            document.getElementById( "InputDate" ).value,
            document.getElementById( "InputTime" ).value  
        )
    }

    function ComputeClick()
    { 
        EventCompute(
            document.getElementById( "InputPrice" ).value,
            document.getElementById( "InputDate" ).value,
            document.getElementById( "InputTime" ).value  
        ); 
    }

    function SaveClick(){ EventSave(); }

    function Mean( Data )
    {
        let Mean_ = 0;

        for( let Cur = 0; Cur < Data.length; Cur ++ )
        {
            Mean_ += Data[ Cur ];
        }

        Mean_ /= Data.length;

        return Mean_;
    }

    function MAD( Data )
    {
        let Mean_ = Mean( Data );
        let MAD_ = 0;

        for( let Cur = 0; Cur < Data.length; Cur ++ )
        {
            MAD_ += Math.abs( Mean_ - Data[ Cur ] );
        }

        MAD_ /= Data.length;

        return MAD_;
    }
//////////////////////////////////////////////////////////////////////////
    function EventInit()
    {
        State_BrunellaLoaded = false;
        State_Values = [];
        State_Dates = [];
        State_Times = [];
        State_Resamples = 1000000;
    }

    function EventInsert( InputValue, InputDate, InputTime )
    {
        if( State_BrunellaLoaded )
        {
            let Date_ = new Date( InputDate );
            if( Date_.getDay() == 0 )
            {
                alert( 'Sunday can\'t be part of selling data :-(' );
            }
            else
            {
                let Index = State_Dates.length - 1;
                let Popup =  confirm( 'Insert the value?\nLast inserted value: ' + parseInt( State_Values[ Index ] ) + ' @ ' + State_Dates[ Index ] + ' ' + State_Times[ Index ] );
                if( Popup )
                {
                    if( ValidateValueDate( InputValue, InputDate, InputTime ) )
                    {
                        alert( 'Inserted new data, remember to save updated file :-)' );
                        State_Values.push( parseInt( InputValue ) );
                        State_Dates.push( InputDate );
                        State_Times.push( InputTime );
                    }
                    else
                    {
                        alert( 'Invalid value or date :-(' );
                    }
                }
            }
        }
        else
        { 
            alert( 'Please upload Brunella.json :-()');
        }
    }

    function EventLoad( InputJSON )
    {
        if( InputJSON[ "Values" ] && InputJSON[ "Dates" ] && InputJSON[ "Times" ] )
        {
            State_Values = InputJSON[ "Values" ];
            State_Dates = InputJSON[ "Dates" ];
            State_Times = InputJSON[ "Times" ];
            if( State_Values != [] && State_Dates != [] && State_Times != [] &&
                ( State_Values.length == State_Dates.length && State_Values.length == State_Times.length )
            )
            {
                State_BrunellaLoaded = true;
            }
            else
            {
                State_Values = [];
                State_Dates = [];
                State_Times = [];
                State_BrunellaLoaded = false;
            }
        }
        else
        {
            alert( 'Bad JSON file :-(' );
            State_BrunellaLoaded = false;
        }
    }

    function EventCompute( InputValue, InputDate, InputTime )
    {
        if( State_BrunellaLoaded )
        {
            if( ValidateValueDate( InputValue, InputDate, InputTime ) )
            {
                // stima probabilità che dato il valore di oggi nei restanti giorni di vendita il prezzo sia più basso
                let Value = parseInt( InputValue );
                let Date_ = new Date( InputDate );

                let RemainingAttempts = 0;
        
                if( Date_.getDay() == 0 )
                {
                    RemainingAttempts = 12;
                }
                else
                {
                    let ActualAttempts = ( Date_.getDay() - 1 ) * 2; // convenzione anglosassone domenica giorno 0
                    if( InputTime === 'Afternoon' ){ ActualAttempts += 1; }

                    RemainingAttempts = 11 - ActualAttempts;
                }

                let TodayBestVector = [];

                for( let CurResample = 0; CurResample < State_Resamples; CurResample ++ )
                {
                    let TodayBest = 100;
                    for( let CurTest = 0; CurTest < RemainingAttempts; CurTest ++ )
                    {
                        if( State_Values[ Math.floor( Math.random() * State_Values.length ) ] > Value )
                        {
                            TodayBest = 0;
                            break;
                        }
                    }
                    TodayBestVector.push( TodayBest );
                }

                let MeanTodayBestVector = Mean( TodayBestVector );
                let MADTodayBestVector = MAD ( TodayBestVector );
                
                if( RemainingAttempts == 12 )
                {
                            document.getElementById( "OutputArea" ).innerHTML = 'Probability of not selling at a better price: ' +
                        MeanTodayBestVector.toFixed( 1 ) + ' \u00B1 ' + MADTodayBestVector.toFixed( 1 ) + '[ % ]';
                }
                else
                {
                            document.getElementById( "OutputArea" ).innerHTML = 'Probability that this is the best price: ' +
                        +  MeanTodayBestVector.toFixed( 1 ) + ' \u00B1 ' + MADTodayBestVector.toFixed( 1 ) + '[ % ]';
                }
            }
            else
            {
                alert( 'Invalid value or date :-(' );
            } 
        }
        else
        { 
            alert( 'Please upload Brunella.json :-()'); 
        }   
    }

    function EventSave()
    {
        if( State_BrunellaLoaded )
        {
            let BlobJSON = new Blob( 
                [ JSON.stringify( { "Values" : State_Values, "Dates" : State_Dates, "Times" : State_Times } ) ],
                { type: "application/json" }
                );

            let Download = document.createElement( 'a' ); // inserisce tag a che è per collegamenti ipertestuali
            let Url = URL.createObjectURL( BlobJSON );
            Download.href = Url;
            Download.download = "Brunella.json";
            Download.click();
            URL.revokeObjectURL( Url );
        }
        else
        {
            alert( 'Please upload Brunella.json :-()');
        }
    }
