(function(){
    const SM=window.SemanticMap=window.SemanticMap||{};
    SM.dailyStories=function(cards=[]){
        const food=cards.find(c=>c.slot==='food')||{word:'パン'};
        return [null,
            {title:['はじまりの手紙','启程的信'],sender:['ポコ','波可'],focus:['写真でことばを集める','用照片收集词语'],letter:[],tasks:[],words:[]},
            {title:['小川のむこうへ','到小溪对岸去'],sender:['遠くの友だち','远方的朋友'],focus:['写真のものを、ポコの世界に届ける','把照片里的东西送进波可的世界'],
             letter:[['手紙、ありがとう。','谢谢你们的信。'],['「'+food.word+'」の写真、うれしかったよ。','收到“'+food.word+'”的照片，我很开心。'],['また、ポコときみのお話を聞かせてね。','下次也告诉我你和波可的故事吧。']],
             words:[['返事','へんじ','回信'],['橋','はし','桥'],['渡る','わたる','渡过']],tasks:[]},
            ...[3,4,5,6,7].map(day=>SM.fieldStories[day])
        ];
    };
})();
