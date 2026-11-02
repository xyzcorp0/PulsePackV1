/* PULSEPACK — base de joueurs de DÉMO (approximative, écrite de mémoire : notes et clubs à vérifier).
   Format : Nom|Poste|Nation(ISO2)|Club|Ligue|Note
   Postes : BU AG AD AT MOC MC MDC MG MD DG DD DC G (anciens codes acceptés) — Ligues : L1 PL LL SA BL AUT LEG (LEG = légendes → rareté Icône)
   Pour charger une vraie base : Paramètres → Importer (CSV/JSON), même colonnes. */
window.RAW_PLAYERS = `
Ousmane Dembélé|BU|FR|PSG|L1|90
Vitinha|MC|PT|PSG|L1|86
Achraf Hakimi|DD|MA|PSG|L1|87
Marquinhos|DC|BR|PSG|L1|86
Désiré Doué|AD|FR|PSG|L1|84
Bradley Barcola|AG|FR|PSG|L1|83
João Neves|MC|PT|PSG|L1|84
Khvicha Kvaratskhelia|AG|GE|PSG|L1|85
Warren Zaïre-Emery|MC|FR|PSG|L1|80
Lucas Hernández|DG|FR|PSG|L1|82
Willian Pacho|DC|EC|PSG|L1|81
Lucas Chevalier|G|FR|PSG|L1|78
Mason Greenwood|AD|GB|Marseille|L1|80
Amine Gouiri|BU|DZ|Marseille|L1|79
Pierre-Emile Højbjerg|MC|DK|Marseille|L1|79
Alexandre Lacazette|BU|FR|Lyon|L1|77
Folarin Balogun|BU|US|Monaco|L1|79
Takumi Minamino|MOC|JP|Monaco|L1|76
Ayyoub Bouaddi|MC|FR|Lille|L1|72
Erling Haaland|BU|NO|Man City|PL|91
Rodri|MDC|ES|Man City|PL|91
Phil Foden|MOC|GB|Man City|PL|86
Rúben Dias|DC|PT|Man City|PL|87
Gianluigi Donnarumma|G|IT|Man City|PL|88
Mohamed Salah|AD|EG|Liverpool|PL|90
Virgil van Dijk|DC|NL|Liverpool|PL|88
Alisson|G|BR|Liverpool|PL|89
Florian Wirtz|MOC|DE|Liverpool|PL|87
Alexander Isak|BU|SE|Liverpool|PL|87
Bukayo Saka|AD|GB|Arsenal|PL|88
Declan Rice|MDC|GB|Arsenal|PL|87
Martin Ødegaard|MOC|NO|Arsenal|PL|87
William Saliba|DC|FR|Arsenal|PL|87
Gabriel Magalhães|DC|BR|Arsenal|PL|86
Eberechi Eze|MOC|GB|Arsenal|PL|81
Bruno Fernandes|MOC|PT|Man Utd|PL|86
Bryan Mbeumo|AD|CM|Man Utd|PL|83
Kobbie Mainoo|MC|GB|Man Utd|PL|78
Cole Palmer|MOC|GB|Chelsea|PL|86
Enzo Fernández|MC|AR|Chelsea|PL|84
Emiliano Martínez|G|AR|Aston Villa|PL|86
Ollie Watkins|BU|GB|Aston Villa|PL|82
Bruno Guimarães|MC|BR|Newcastle|PL|84
Sandro Tonali|MDC|IT|Newcastle|PL|82
Anthony Gordon|AG|GB|Newcastle|PL|80
Lucas Paquetá|MC|BR|West Ham|PL|82
Jarrod Bowen|AD|GB|West Ham|PL|81
Pedro Porro|DD|ES|Tottenham|PL|80
Kylian Mbappé|BU|FR|Real Madrid|LL|91
Vinícius Júnior|AG|BR|Real Madrid|LL|90
Jude Bellingham|MOC|GB|Real Madrid|LL|90
Thibaut Courtois|G|BE|Real Madrid|LL|89
Federico Valverde|MC|UY|Real Madrid|LL|88
Antonio Rüdiger|DC|DE|Real Madrid|LL|85
Rodrygo|AD|BR|Real Madrid|LL|85
Aurélien Tchouaméni|MDC|FR|Real Madrid|LL|84
Trent Alexander-Arnold|DD|GB|Real Madrid|LL|86
Arda Güler|MOC|TR|Real Madrid|LL|80
Endrick|BU|BR|Real Madrid|LL|80
Lamine Yamal|AD|ES|Barcelona|LL|89
Raphinha|AD|BR|Barcelona|LL|88
Robert Lewandowski|BU|PL|Barcelona|LL|88
Pedri|MC|ES|Barcelona|LL|87
Marc-André ter Stegen|G|DE|Barcelona|LL|88
Jules Koundé|DD|FR|Barcelona|LL|85
Ronald Araújo|DC|UY|Barcelona|LL|84
Gavi|MC|ES|Barcelona|LL|83
Marcus Rashford|AG|GB|Barcelona|LL|82
Antoine Griezmann|AT|FR|Atlético Madrid|LL|86
Julián Álvarez|BU|AR|Atlético Madrid|LL|86
Jan Oblak|G|SI|Atlético Madrid|LL|88
Nico Williams|AG|ES|Athletic Club|LL|84
Iñaki Williams|AD|GH|Athletic Club|LL|78
Mikel Oyarzabal|BU|ES|Real Sociedad|LL|82
Takefusa Kubo|AD|JP|Real Sociedad|LL|80
Lautaro Martínez|BU|AR|Inter|SA|89
Nicolò Barella|MC|IT|Inter|SA|87
Alessandro Bastoni|DC|IT|Inter|SA|87
Hakan Çalhanoğlu|MDC|TR|Inter|SA|86
Marcus Thuram|BU|FR|Inter|SA|85
Rafael Leão|AG|PT|AC Milan|SA|86
Mike Maignan|G|FR|AC Milan|SA|87
Luka Modrić|MC|HR|AC Milan|SA|85
Dušan Vlahović|BU|RS|Juventus|SA|82
Kenan Yıldız|BU|TR|Juventus|SA|82
Khéphren Thuram|MC|FR|Juventus|SA|79
Kevin De Bruyne|MOC|BE|Napoli|SA|87
Scott McTominay|MC|GB|Napoli|SA|83
Paulo Dybala|AT|AR|Roma|SA|82
Ademola Lookman|AG|NG|Atalanta|SA|84
Harry Kane|BU|GB|Bayern Munich|BL|91
Jamal Musiala|MOC|DE|Bayern Munich|BL|88
Joshua Kimmich|MDC|DE|Bayern Munich|BL|87
Michael Olise|AD|FR|Bayern Munich|BL|86
Manuel Neuer|G|DE|Bayern Munich|BL|85
Luis Díaz|AG|CO|Bayern Munich|BL|85
Kingsley Coman|AG|FR|Bayern Munich|BL|84
Alphonso Davies|DG|CA|Bayern Munich|BL|83
Serhou Guirassy|BU|GN|Dortmund|BL|85
Nico Schlotterbeck|DC|DE|Dortmund|BL|83
Julian Brandt|MOC|DE|Dortmund|BL|82
Patrik Schick|BU|CZ|Leverkusen|BL|83
Lionel Messi|AD|AR|Inter Miami|AUT|88
Cristiano Ronaldo|BU|PT|Al-Nassr|AUT|86
Victor Osimhen|BU|NG|Galatasaray|AUT|86
Son Heung-min|AG|KR|LAFC|AUT|85
Karim Benzema|BU|FR|Al-Ittihad|AUT|82
Neymar|AG|BR|Santos|AUT|82
Sadio Mané|AG|SN|Al-Nassr|AUT|82
N'Golo Kanté|MDC|FR|Al-Ittihad|AUT|80
Pelé|BU|BR|Légende|LEG|98
Diego Maradona|AT|AR|Légende|LEG|98
Johan Cruyff|AT|NL|Légende|LEG|96
Ronaldo Nazário|BU|BR|Légende|LEG|96
Zinedine Zidane|MOC|FR|Légende|LEG|96
Franz Beckenbauer|DC|DE|Légende|LEG|95
Ronaldinho|MOC|BR|Légende|LEG|95
Paolo Maldini|DG|IT|Légende|LEG|94
Andrés Iniesta|MC|ES|Légende|LEG|94
Lev Yachine|G|RU|Légende|LEG|94
Thierry Henry|AG|FR|Légende|LEG|93
Michel Platini|MOC|FR|Légende|LEG|93
George Best|AG|GB|Légende|LEG|93
Gianluigi Buffon|G|IT|Légende|LEG|93
Xavi|MC|ES|Légende|LEG|92
Andrea Pirlo|MC|IT|Légende|LEG|92
Iker Casillas|G|ES|Légende|LEG|92
Roberto Carlos|DG|BR|Légende|LEG|91
Kaká|MOC|BR|Légende|LEG|91
Ruud Gullit|MC|NL|Légende|LEG|91
Steven Gerrard|MC|GB|Légende|LEG|91
Peter Schmeichel|G|DK|Légende|LEG|91
Eric Cantona|AT|FR|Légende|LEG|90
Didier Drogba|BU|CI|Légende|LEG|90
Fabio Cannavaro|DC|IT|Légende|LEG|90
Cafu|DD|BR|Légende|LEG|90
Frank Lampard|MC|GB|Légende|LEG|90
Samuel Eto'o|BU|CM|Légende|LEG|89
Patrick Vieira|MDC|FR|Légende|LEG|89
Lilian Thuram|DD|FR|Légende|LEG|88
`;
