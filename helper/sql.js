const sql = require('mysql2');

const conexao =  sql.createConnection({
        host: 'localhost',
        user: 'duca',
        password: '197525',
        database: 'duca-siac'
    })
        
    
    conexao.connect((err)=>{
    if(err) return console.log(' Erro ao conectar ao banco de dados');
    return console.log('banco de dados conectados!')
})

//função para adicionar usuario

const addUser =(user, callback) =>{
         conexao.query(`insert into usuario(nome, email, nomeUser, password) values (?,?,?,?)`, [user.nome, user.email, user.nomeUser, user.password], (error, results, fields)=>{
        if(error) return console.log('Erro ao executar a consulta: ', error.message);
        console.log('Dados Inseridos', user)
        console.log('dados das colunas: ', results);
        callback(null, results, user);
    })
}
//pegar usuario
const loginUser = (user, callback)=>{
    conexao.query(`select * from usuario where (email = ? or nomeUser = ?) and password = ?`, [user.emailUsuario, user.emailUsuario, user.password], (error, results)=>{
        if(error) return console.log('erro ao selecionar usuário');
        else if(results.length>0){
            console.log('usuario perfeitamente encontrado!', results[0]);
            callback(null, results);
        }
        else return console.log('usuário não encontrado!');
        
    })
}

//Pegar dados do psicologo
const getPsico = (callback)=>{
    conexao.query(`SELECT * FROM profissionalpsicologo`, (error, results1)=>{
        if(error) return console.log('Falha na consulta');
        else if(results1.length>0){
            console.log('psicologos encontrados!', results1);
            conexao.query(`SELECT * FROM agenda where idPsico = 3`, (error, results2)=>{
                if(error) return console.log('Falha na consulta de horário');
                else if(results2.length>0){
                    console.log('Horarios Encontrados!', results2);
                    callback(null, {psicologos: results1, agenda: results2});
                }
                
            })
        }
    })
}

const setHorario = (horario, callback)=>{

    conexao.query(`select * from horario where hora = ? and idUser =?`, [horario.hora, horario.idUser], (error, results)=>{
        if(error) return console.log('erro na consulta')
        else if(results.length>0) return console.log('Usuario encontrado! não pode adicionar usuário pois ja existe agendamento!')
        else{
            conexao.query(`insert into horario(hora, idUser, disponibilidade) values(?, ?, 1)`, [horario.hora, horario.idUser], (error, results)=>{
                if(error) return console.log('falha na consulta!');
                else if(results.affectedRows>0){
                    console.log('Horarios: ', horario);
                    callback(null, results, horario)
                }
                else{
                    console.log('Nenhuma Linha afetada!');
                }
            })
    }})
    
    
}

const getUser = (idUser, callback)=>{
    conexao.query(`select * from usuario where idUser = ?`, [idUser], (error, results)=>{
        if(error) return console.log('Erro na consulta');
        else if(results.length>0){
            console.log('usuario encontrado: ', results[0]);
            callback(null, results);
        }
        else{
            console.log('usuario não encontrado !');
            callback(error, null);
        }
    })
}

const updateUser = (usuario, callback) =>{
    console.log('id User:' , usuario.idUser)
    conexao.query(`UPDATE usuario SET nome = ?, email = ?, celular = ?, nomeUser = ? where idUser = ?`, [usuario.nome, usuario.email, usuario.celular, usuario.nomeUser, usuario.idUser], (error, results)=>{
        if(error) return console.log('Erro na consulta', error)
        else if(results.affectedRows>0){
            console.log('Update feito sql.js !', usuario);
            callback(null, results, usuario);
        }
        else{
            console.log('Nenhuma linha atualizada', results[0]); // se retorna essa condição é pq não ta encontrando nenhuma linha relacionado ao where
        }
    })
}

//adicionar agenda
const addAgenda = (agenda, callback)=>{
    console.log('Agenda no sql: ', agenda)
     conexao.query(`insert into agenda(horaIni, horaFin, data, diaSemana,idPsico) values(?, ?, ?, ?, 1)`, [agenda.horaIni, agenda.horaFin, agenda.data, agenda.diaSemana], (error, results)=>{
        if(error) return console.log('Erro na consulta');
        else if(results.affectedRows>0){
            console.log('Agendada adicionada com sucesso: ', results.insertId);
            var idAgenda = results.insertId
            var horaIni = agenda.horaIni;
            console.log('Hora Inicial: ', horaIni);

            var horaFin = agenda.horaFin;
            console.log('Hora Final: ', horaFin);
            var horaAtual = horaIni;
            var horas = []
            
            function inserirHorario() {
                console.log(horaFin)
                if (horaAtual > horaFin) {
                    // Se já passou da hora final, finaliza a inserção
                    console.log('Inserção de horários finalizada');
                    console.log('Array de Horas:', horas);
                    return callback(null, { agenda: agenda, horas: horas });
                }

                conexao.query(`INSERT INTO horario(hora, idAgenda) VALUES (?, ?)`, [horaAtual, idAgenda], (error, results2) => {
                    if (error) {
                        console.log('Erro ao adicionar horário:', error);
                    } else if (results2.affectedRows > 0) {
                        console.log('Horário adicionado com sucesso:', horaAtual);
                        horas.push(horaAtual);
                    } else {
                        console.log('Nenhuma linha afetada ao adicionar horário:', horaAtual);
                    }

                    var [hora, minuto] = horaAtual.split(':');
                     minuto = parseInt(minuto) + 30;
                     hora = parseInt(hora);
                    if (minuto >= 60) {
                        minuto = minuto-60;
                        hora +=1;
                        
                    } 
                    horaAtual = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;


                    inserirHorario(); // Chama a função recursivamente
                });
            }

            inserirHorario();
            

            
        }
        else{
            console.log('nenhuma linha foi afetada');
        }
    })
    
}


module.exports = {
    addUser,
    loginUser,
    getPsico,
    setHorario,
    getUser,
    updateUser,
    addAgenda
}