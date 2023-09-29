

//var Color = importNamespace('PixelCombats.ScriptingApi.Structures');
//var System = importNamespace('System');

// константы
var WaitingPlayersTime = 10;
var BuildBaseTime = 130;
var GameModeTime = 1200;
var EndOfMatchTime = 10;

// константы имен
var WaitingStateValue = "Waiting";
var BuildModeStateValue = "BuildMode";
var GameStateValue = "Game";
var EndOfMatchStateValue = "EndOfMatch";

// посто€нные переменные
var mainTimer = Timers.GetContext().Get("Main");
var stateProp = Properties.GetContext().Get("State");

// примен€ем параметры создани€ комнаты
Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// блок игрока всегда усилен
BreackGraph.PlayerBlockBoost = true;

// параметры игры
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = false;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// создаем команды
Teams.Add("Blue", "<size=64><color=#dedd2d>А</color><color=#dedb31>Л</color><color=#ded935>Ь</color><color=#ded739>Я</color><color=#ded53d>Н</color><color=#ded341>С</color><color=#ded145> </color></size>", { b: 100 });
Teams.Add("Red", " <size=30><color=#dedd2d>С</color><color=#dedb31>В</color><color=#ded935>О</color><color=#ded739>Б</color><color=#ded53d>О</color><color=#ded341>Д</color><color=#ded145>А</color></size>", { r: 1, g: 1, b: 1 });
var blueTeam = Teams.Get("Blue");
var redTeam = Teams.Get("Red");
blueTeam.Spawns.SpawnPointsGroups.Add(1);
redTeam.Spawns.SpawnPointsGroups.Add(2);
blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// задаем макс смертей команд
var maxDeaths = Players.MaxCount * 10;
Teams.Get("Red").Properties.Get("Deaths").Value = maxDeaths;
Teams.Get("Blue").Properties.Get("Deaths").Value = maxDeaths;
// задаем что выводить в лидербордах
LeaderBoard.PlayerLeaderBoardValues = [
	{
		Value: "Kills",
		DisplayName: " Kills",
		ShortDisplayName: "ВПЕРЕД"
	},
	{
		Value: "Deaths",
		DisplayName: "Statistics/Deaths",
		ShortDisplayName: " <size=30><color=#51b2ff>А</color><color=#4699db>Л</color><color=#3b80b7>Ь</color><color=#306793>Я</color><color=#254e6f>Н</color><color=#1a354b>С</color><color=#0f1c27> </color></size>"
	},
	{
		Value: "Spawns",
		DisplayName: "Statistics/Spawns",
		ShortDisplayName: "СЛАВА"
	},
	{
		Value: "Scores",
		DisplayName: "Statistics/Scores",
		ShortDisplayName: "<size=30><color=#51b2ff>А</color><color=#4699db>Л</color><color=#3b80b7>Ь</color><color=#306793>Я</color><color=#254e6f>Н</color><color=#1a354b>С</color><color=#0f1c27>У</color></size>"
	}
];
LeaderBoard.TeamLeaderBoardValue = {
	Value: "Deaths",
	DisplayName: "Statistics\Deaths",
	ShortDisplayName: "Statistics\Deaths"
};
// вес команды в лидерборде
LeaderBoard.TeamWeightGetter.Set(function(team) {
	return team.Properties.Get("Deaths").Value;
});
// вес игрока в лидерборде
LeaderBoard.PlayersWeightGetter.Set(function(player) {
	return player.Properties.Get("Kills").Value;
});










// разрешаем вход в команды по запросу
Teams.OnRequestJoinTeam.Add(function(player,team){team.Add(player);});
// спавн по входу в команду
Teams.OnPlayerChangeTeam.Add(function(player){ player.Spawns.Spawn()});

// делаем игроков неуязвимыми после спавна
var immortalityTimerName="immortality";
Spawns.GetContext().OnSpawn.Add(function(player){
	player.Properties.Immortality.Value=true;
	timer=player.Timers.Get(immortalityTimerName).Restart(5);
});
Timers.OnPlayerTimer.Add(function(timer){
	if(timer.Id!=immortalityTimerName) return;
	timer.Player.Properties.Immortality.Value=false;
});

// после каждой смерти игрока отнимаем одну смерть в команде
Properties.OnPlayerProperty.Add(function(context, value) {
	if (value.Name !== "Deaths") return;
	if (context.Player.Team == null) return;
	context.Player.Team.Properties.Get("Deaths").Value--;
});
// если в команде количество смертей занулилось то завершаем игру
Properties.OnTeamProperty.Add(function(context, value) {
	if (value.Name !== "Deaths") return;
	if (value.Value <= 0) SetEndOfMatchMode();
});

// счетчик спавнов
Spawns.OnSpawn.Add(function(player) {
	++player.Properties.Spawns.Value;
});
// счетчик смертей
Damage.OnDeath.Add(function(player) {
	++player.Properties.Deaths.Value;
});
// счетчик убийств
Damage.OnKill.Add(function(player, killed) {
	if (killed.Team != null && killed.Team != player.Team) {
		++player.Properties.Kills.Value;
		player.Properties.Scores.Value += 100;
	}
});

// настройка переключени€ режимов
mainTimer.OnTimer.Add(function() {
	switch (stateProp.Value) {
	case WaitingStateValue:
		SetBuildMode();
		break;
	case BuildModeStateValue:
		SetGameMode();
		break;
	case GameStateValue:
		SetEndOfMatchMode();
		break;
	case EndOfMatchStateValue:
		RestartGame();
		break;
	}
});

// задаем первое игровое состо€ние
SetWaitingMode();

// состо€ни€ игры
function SetWaitingMode() {
	stateProp.Value = WaitingStateValue;
	Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
	Spawns.GetContext().enable = false;
	mainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() 
{
	stateProp.Value = BuildModeStateValue;
	Ui.GetContext().Hint.Value =" СЛАВА АЛЬЯНСУ ! ";
	var inventory = Inventory.GetContext();
	inventory.Main.Value = false;
	inventory.Secondary.Value = false;
	inventory.Melee.Value = true;
	inventory.Explosive.Value = false;
	inventory.Build.Value = true;
 inventory.BuildInfinity.Value = true;

	mainTimer.Restart(BuildBaseTime);
	Spawns.GetContext().enable = true;
	SpawnTeams();
}
function SetGameMode() 
{
	stateProp.Value = GameStateValue;
	Ui.GetContext().Hint.Value = "БОЙ";

	var inventory = Inventory.GetContext();
	if (GameMode.Parameters.GetBool("OnlyKnives")) {
		inventory.Main.Value = false;
		inventory.Secondary.Value = false;
		inventory.Melee.Value = true;
		inventory.Explosive.Value = false;
		inventory.Build.Value = true;
	} else {
		inventory.Main.Value = true;
		inventory.Secondary.Value = true;
		inventory.Melee.Value = true;
		inventory.Explosive.Value = false;
		inventory.Build.Value = true;
	}

	mainTimer.Restart(GameModeTime);
	Spawns.GetContext().Despawn();
	SpawnTeams();
}
function SetEndOfMatchMode() {
	stateProp.Value = EndOfMatchStateValue;
	Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

	var spawns = Spawns.GetContext();
	spawns.enable = false;
	spawns.Despawn();
	Game.GameOver(LeaderBoard.GetTeams());
	mainTimer.Restart(EndOfMatchTime);
}
function RestartGame() {
	Game.RestartGame();
}

function SpawnTeams() {
	var e = Teams.GetEnumerator();
	while (e.moveNext()) {
		Spawns.GetContext(e.Current).Spawn();
	}
}


// приветсвие 
Ui.getContext().Hint.Value = "ЗДАРОВА";



//всем хп=200
contextedProperties.getContext().MaxHp.Value = 1;





// убийства команд
Teams.Get("Red").Properties.Get("Kills").Value = 0;
Teams.Get("Blue").Properties.Get("Kills").Value = 0;
// выводим убийства команд
Ui.GetContext().TeamProp1.Value = { Team: "Red", Prop: "Kills" };
Ui.GetContext().TeamProp2.Value = { Team: "Blue", Prop: "Kills" };
// счётчик убийств
Damage.OnKill.Add(function(player, killed){
	if(killed.Team == player.Team) return;
	player.Team.Properties.Get("Kills").Value += 1;
	player.Properties.Kills.Value += 1;
	player.Properties.Get("ScoresT").Value += 100;
});





