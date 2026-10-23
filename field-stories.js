(function(){
    const SM=window.SemanticMap=window.SemanticMap||{};
    const map=kind=>({kind:'map',place:kind});
    const photo=(slot,group,prompt)=>({kind:'photo',slot,group,prompt});
    const place=(slot,reference,icon,where,theme)=>({kind:'place',slot,reference,icon,where,theme});
    const talk=(prompt,choices,answer)=>({kind:'talk',prompt,choices,answer});
    const phrase=tokens=>({kind:'phrase',tokens});
    const reply=()=>({kind:'reply'});
    SM.fieldStories={
        3:{title:['ポコの新しい仕事机','波可的新工作台'],sender:['ポコ','波可'],place:'shop',theme:'desk',
            letter:[['この前は、小川を渡れたね。ありがとう！','上次我们过了小溪，谢谢你！'],['今日は、郵便局の机を片づけたいんだ。手紙を書く道具が、まだ足りないよ。','今天想整理邮局的桌子，可是写信的工具还不够。'],['本とペンがあれば、また手紙を書けるね。きみの世界から、届けてくれる？','有书和笔，就又能写信了。能从你的世界送来吗？']],
            focus:['机の上・本の右／手紙を書く','桌子上面、书的右边／写信'],words:[['本','ほん','书'],['ペン','ぺん','笔'],['右','みぎ','右边']],
            tasks:[map('shop'),photo('book','book',['机に置く本を、ひとつ届けよう。','拍一本书，送到工作台。']),place('book','机','book','on','desk'),talk(['これで、何ができそう？','有了这些，可以做什么？'],['手紙を書けるね。','電車に乗れるね。','雨がふるね。'],0),photo('pen','pen',['手紙を書くものを、届けよう。','拍一件写字用的东西。']),place('pen','本','book','right','desk'),phrase(['本の右に、','{pen}を','置いたよ。']),reply()]},
        4:{title:['ミナの小さなお茶会','米娜的小小茶会'],sender:['ミナ','米娜'],place:'shop',theme:'tea',
            letter:[['ポコの机、使いやすくなったみたい。','波可的新桌子好像很好用。'],['今日は、郵便局で小さなお茶会をひらくよ。でも、テーブルの上が空っぽ。','今天想在邮局办个小茶会，可是桌上还空空的。'],['飲みものと、おやつを届けてね。一緒に準備しよう。','送来饮品和点心吧，一起准备。']],
            focus:['テーブルの上・カップのとなり／飲む・食べる','桌上、杯子旁边／喝、吃'],words:[['飲みもの','のみもの','饮品'],['おやつ','おやつ','点心'],['となり','となり','旁边']],
            tasks:[map('shop'),photo('drink','drink',['お茶会の飲みものを、ひとつ届けよう。','拍一份茶会上的饮品。']),place('drink','テーブル','cup','on','tea'),talk(['飲みものが届いたよ。何と言おう？','饮品送来了，可以说什么？'],['どこにいますか。','ありがとう。どうぞ！','切符をください。'],1),photo('food','food',['一緒に食べたいおやつを、届けよう。','拍一份想一起吃的点心或食物。']),place('food','カップ','cup','next','tea'),phrase(['{drink}を','飲みながら、','話そう。']),reply()]},
        5:{title:['公園に、ひと休みの場所を','在公园布置休息角'],sender:['リリ','莉莉'],place:'park',theme:'park',
            letter:[['お茶会、楽しそうだったね！','茶会看起来很开心！'],['公園の木の下にも、ひと休みできる場所があったらいいな。','如果公园的树下也能有个休息的地方就好了。'],['ポコの世界では、小さな本もベンチになるよ。花も飾ってみたいな。','在波可的世界里，小小的书也能变成长椅。还想放一朵花。']],
            focus:['木の下・ベンチの左／花を見る','树下、长椅左边／看花'],words:[['木','き','树'],['下','した','下面'],['左','ひだり','左边']],
            tasks:[map('park'),photo('seat','seat',['ベンチにできそうなものを、届けよう。','拍一件能变成小长椅的东西，书也可以。']),place('seat','木','tree','below','park'),talk(['木の下なら、どんな時間にしよう？','在树下，可以做些什么？'],['切符を買おう。','あわてて走ろう。','ゆっくり休もう。'],2),photo('flower','flower',['休憩場所に飾る花を、届けよう。','拍一朵花，装饰休息角。']),place('flower','ベンチ','book','left','park'),phrase(['木の下で、','{flower}を','見つけたよ。']),reply()]},
        6:{title:['駅前の、小さな目印','车站前的小小标记'],sender:['駅の郵便屋さん','车站的邮递员'],place:'station',theme:'station',
            letter:[['友だちへの荷物が、そろいました。','要寄给朋友的东西都备齐了。'],['今日は、駅前でポコと待ち合わせ。分かりやすい目印を作りましょう。','今天和波可在车站前会合，做个容易认的标记吧。'],['右と左を確かめて、きみの写真を飾ってください。','分清左右，把你的照片摆好。']],
            focus:['駅の右・ポストの前／駅で待つ','车站右边、邮筒前面／在车站等候'],words:[['駅','えき','车站'],['目印','めじるし','标记'],['前','まえ','前面']],
            tasks:[map('station'),photo('sign','station',['駅名の看板を、ひとつ届けよう。','拍一张车站站名牌。']),place('sign','駅','station','right','station'),talk(['待ち合わせる場所が分からない。どう聞こう？','不知道会合地点，怎么问？'],['どこで待ちますか。','何を食べますか。','おいくらですか。'],0),photo('marker','marker',['目印にしたいものを、届けよう。','拍一件想作为标记的物品。']),place('marker','ポスト','mail','front','station'),phrase(['ポストの前で、','ポコを','待っているよ。']),reply()]},
        7:{title:['七日目の、ありがとう','第七天，谢谢你'],sender:['遠くの友だち','远方的朋友'],place:'park',theme:'party',
            letter:[['きみが届けたもので、町が少しずつ変わったね。','你送来的东西，让小镇一点一点变了。'],['橋、仕事机、お茶会、公園、駅の目印。どれも大切な思い出だよ。','小桥、工作台、茶会、公园、车站的标记，都是珍贵的回忆。'],['最後に、小さなお祝いをしよう。好きなものを届けて、一週間の手紙を書いてね。','最后办一个小庆典吧。送来喜欢的东西，写一封这一周的回信。']],
            focus:['右・左を使う／思い出を手紙にする','使用右、左／把回忆写进信里'],words:[['思い出','おもいで','回忆'],['ありがとう','ありがとう','谢谢'],['また','また','再、又']],
            tasks:[map('park'),photo('gift','favorite',['お祝いに届けたいものを、ひとつ撮ろう。','拍一件想送来庆祝的物品。']),place('gift','テーブル','cup','right','party'),talk(['七日間を一緒に過ごした友だちへ。何と言おう？','对一起度过七天的朋友，说些什么？'],['ここはどこですか。','一緒に遊んでくれて、ありがとう。','切符をひとつください。'],1),photo('decoration','flower',['最後の会場に飾る花を、届けよう。','拍一朵花，装饰最后的会场。']),place('decoration','ポスト','mail','left','party'),phrase(['また、','一緒に','遊ぼうね。']),reply()]}
    };
    SM.fieldPhotoGroups={
        tree:{label:['木','树'],allowed:'a visible real tree, not a drawing or artificial tree',sample:{word:'木',kana:'き',photo:'assets/sample-photos/tree.jpg'}},
        leaf:{label:['葉っぱ','叶子'],allowed:'a visible real leaf or leaves on a plant or tree',sample:{word:'葉っぱ',kana:'はっぱ',photo:'assets/sample-photos/leaf.jpg'}},
        book:{label:['本','书'],allowed:'a visible book or notebook',sample:{word:'本',kana:'ほん',photo:'assets/sample-photos/book.svg'}},
        pen:{label:['書くもの','写字工具'],allowed:'a visible pen, pencil, marker or crayon',sample:{word:'ペン',kana:'ぺん',photo:'assets/sample-photos/pen.jpg'}},
        drink:{label:['飲みもの','饮品'],allowed:'a visible non-alcoholic beverage, including coffee, tea, water, milk, juice or soda; not an empty container',sample:{word:'コーラ',kana:'こーら',photo:'assets/sample-photos/cola.png'}},
        food:{label:['食べもの','食物'],allowed:'visible food such as bread, fruit or a packaged snack, not drinks or empty packages',sample:{word:'パン',kana:'ぱん',photo:'assets/sample-photos/bread.jpg'}},
        seat:{label:['小さなベンチにするもの','能做小长椅的东西'],allowed:'a visible book, notebook, box, stool, chair or bench; these become fictional tiny seats',sample:{word:'本',kana:'ほん',photo:'assets/sample-photos/book.svg'}},
        flower:{label:['花','花'],allowed:'a visible real flower or flowering plant',sample:{word:'花',kana:'はな',photo:'assets/sample-photos/flower.jpg'}},
        station:{label:['駅名の看板','车站站名牌'],allowed:'a visible railway or subway station name sign or station entrance signage; any real station is accepted',sample:{word:'茨木駅',kana:'いばらきえき',photo:'assets/sample-photos/ibaraki-station.png'}},
        marker:{label:['目印にするもの','用作标记的东西'],allowed:'a clearly visible everyday physical object that can serve as a fictional landmark, such as a flower, bottle, book, bag or toy; not a person or empty scenery',sample:{word:'コーラ',kana:'こーら',photo:'assets/sample-photos/cola.png'}},
        favorite:{label:['好きなもの','喜欢的物品'],allowed:'a clearly visible everyday object, food, beverage, flower or toy; not a person, face, screen of text only or empty scenery',sample:{word:'パン',kana:'ぱん',photo:'assets/sample-photos/bread.jpg'}}
    };
})();
