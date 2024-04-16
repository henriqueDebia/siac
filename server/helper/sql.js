import { callActionApi } from 'adminjs';
import sql from 'mysql2';
export default sql

const conexao = sql.createPool({
    host: 'viaduct.proxy.rlwy.net',
    user: 'root',
    port: '59008',
    password: 'SOcIQaVfgDEqWGVHlkPAEDlJnUICubme',
    database: 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    
})

conexao.getConnection((error) => {
    if (error) return console.log('Erro ao se conectar ao banco de dados.', error);
    console.log('Banco de dados conectado!');
})

// Encerrando a conexão do pool quando a aplicação for desligada:
process.on('exit', () => {
    conexao.end(error => {
        if (error) {
            console.error('Erro ao encerrar a conexão do pool: ', error);
        }

        else {
            console.log('Conexão do pool encerrada com sucesso!');
        }
    })
})


// -------------------- INÍCIO DE CONSULTAS NO BANCO PARA USUÁRIOS:
// Função para adicionar usuario:
const addUser = (user, end, callback) => {
    // Inserir usuário
    conexao.query(`INSERT INTO usuario(nome, email, nomeUser, perfil, password) VALUES (?,?,?,?,?)`, [user.nome, user.email, user.nomeUser, user.perfil, user.password], (error, results, fields) => {
        if (error) {
            return console.log('Erro ao inserir usuário: ', error);
        }

        // Obter o ID do usuário inserido
        const usuarioId = results.insertId;

        // Inserir endereço associado ao usuário
        conexao.query(`INSERT INTO endereco(idUser, logradouro, bairro, cidade, estado, numero) VALUES(?,?,?,?,?,?)`, [usuarioId, end.logradouro, end.bairro, end.localidade, end.uf, end.numero], (error, results, fields) => {
            if (error) {
                return console.log('Erro ao inserir endereço: ', error.message);
            }

            console.log('Usuário e endereço inseridos com sucesso!');
            callback(null, results, user);
        });
    });
};

//Esqueci Senha
const getEmail = (email, callback)=>{
    var query = `SELECT * FROM usuario WHERE email = ?`
    conexao.query(query, [email], (error, results)=>{
        if(error) return console.log('Erro: ', error);
        console.log('Dados do usuário: ', results);
        callback(null, results);
        
    })
}


// Pegar usuário:
const loginUser = (user, callback) => {
    conexao.query(`SELECT * FROM usuario WHERE (email = ? or nomeUser = ?) AND password = ?`, [user.emailUsuario, user.emailUsuario, user.password], (error, results) => {
        if (error) {
            return console.log('Erro ao selecionar usuário.');
        }
        else if (results.length > 0) {
            console.log('Usuário perfeitamente encontrado!', results[0]);
            callback(null, results);
        }
        else {
            return console.log('Usuário não encontrado!');
        }
    })
}

// Pegar dados do psicólogo:
const getPsico = (callback) => {
    conexao.query(`SELECT * FROM usuario where perfil = 'psicologo'`, (error, results1) => {
        if (error) {
            return console.log('Falha na consulta.');
        }
        else if (results1.length > 0) {
            console.log('Psicólogos encontrados!', results1);
            conexao.query(`SELECT * FROM agenda`, (error, results2) => {
                if (error) return console.log('Falha na consulta de horário');
                else if (results2.length > 0) {
                    console.log('Agendas encontradas!', results2);
                    conexao.query(`SELECT * FROM horario`, (error, results3) => {
                        if (error) {
                            return console.log('Erro na consulta.');
                        }
                        else if (results3.length > 0) {
                            console.log('Horários da agenda encontrados!', results3);
                            callback(null, { psicologos: results1, agenda: results2, horarios: results3 });
                        }
                        else {
                            console.log('Nenhum horário encontrado!');
                        }
                    })
                }
                else {
                    console.log('Nenhuma agenda encontrada, somente psicólogo cadastrado.');
                    callback(null, { psicologos: results1, agenda: results2 });

                }
            })
        }
        else {
            console.log('Nenhum psicólogo encontrado, portanto sem agenda cadastradas.');
            callback(null, null);
        }
    })
}

const getHorario = (horario, callback) => {
    conexao.query(`select * from horario where hora = ? and idUser =?`, [horario.hora, horario.idUser], (error, results) => {
        if (error) {
            return console.log('Erro na consulta.');
        }
        else if (results.length > 0) {
            return console.log('Usuário encontrado! Não foi possível adicionar usuário pois já existe agendamento!');
        }
        else {
            conexao.query(`insert into horario(hora, idUser, disponibilidade) values(?, ?, 1)`, [horario.hora, horario.idUser], (error, results) => {
                if (error) return console.log('Falha na consulta!');

                else if (results.affectedRows > 0) {
                    console.log('Horários: ', horario);
                    callback(null, results, horario)
                }

                else {
                    console.log('Nenhuma linha afetada!');
                }
            })
        }
    })
}

const updateHorario = (horario, callback) => {
    conexao.query(`UPDATE horario set disponibilidade = 1, idUser = ? where hora = ?`, [horario.idUser, horario.hora], (error, results) => {
        if (error) return console.log('Erro na consulta ao banco de dados.');
        else if (results.affectedRows > 0) {
            console.log('Atualização realizada!');
            callback(null, results);
        }
        else {
            console.log('Nenhuma linha afetada!');
        }
    })
}

const getUser = (idUser, callback) => {
    conexao.query(`SELECT horario.*, agenda.*, usuario.*
        FROM horario
        INNER JOIN agenda ON horario.idAgenda = agenda.idAgenda
        INNER JOIN usuario ON agenda.idUser = usuario.idUser
        WHERE horario.idUser = ?;
    `, [idUser], (error, results) => {
        if (error) return console.log('Erro na consulta.', error);
        else if (results.length > 0) {
            console.log('Usuário encontrado: ', results);
            callback(null, results);
        }
        else {
            console.log('select pra horario, agenda e usuario não foi!');
            conexao.query(`SELECT * FROM usuario where idUser = ?`, [idUser], (error, results) => {
                if (error) console.log('Erro de consulta.');
                console.log('Usuário encontrado, porém não existe agenda: ', results);
                callback(null, results);
            })

        }
    })
}

const updateUser = (usuario, callback) => {
    console.log('id User:', usuario.idUser)
    conexao.query(`UPDATE usuario SET nome = ?, email = ?, celular = ?, nomeUser = ? where idUser = ?`, [usuario.nome, usuario.email, usuario.celular, usuario.nomeUser, usuario.idUser], (error, results) => {
        if (error) return console.log('Erro na consulta. Status:', error);
        else if (results.affectedRows > 0) {
            console.log('Atualização feita sql.js!', usuario);
            callback(null, results, usuario);
        }
        else {
            console.log('Nenhuma linha atualizada.', results[0]);
            // Se retornar essa condição é pq não foi encontrado nenhuma linha relacionado ao WHERE.
        }
    })
}

const deleteHorario = (idHorario, callback) => {
    conexao.query(`UPDATE horario SET disponibilidade = 0, idUser = null WHERE idHorario = ?`, [idHorario], (error, results) => {
        if (error) return console.log('Erro na consulta.');
        else if (results.affectedRows > 0) callback(null, idHorario);
        else console.log('Nenhuma linha deletada!', results);
    })
}

const getAgenda = (idUser, callback) => {
    conexao.query(`SELECT * FROM horario WHERE idUser = ?`, [idUser], (error, results) => {
        if (error) return console.log('Erro de consulta.');
        callback(null, results);
    })
}

const getHours = (dados, callback) =>{
    var query = `SELECT horario.*, agenda.*, usuario.*
    FROM horario 
    INNER JOIN agenda ON horario.idAgenda = agenda.idAgenda 
    INNER JOIN usuario ON agenda.idUser = usuario.idUser 
    WHERE 1=1 `
    var parametros = []
    if(dados.diaSemana){ 
        query += `AND agenda.diaSemana = ?`
        parametros.push(dados.diaSemana)
    }
    if(dados.data){
        query += `AND agenda.data = ?`
        parametros.push(dados.data)
    }

    if(dados.idUser){
        query += `AND usuario.idUser = ?`
        parametros.push(dados.idUser)
    }
    
    if(dados.hora) {
        query += `AND horario.hora = ?`
        parametros.push(dados.hora);
    }
    conexao.query(query, parametros, (error, results)=>{
        if(error) return console.log('Erro na Consulta do Banco!')
        console.log('Resultado da Conulta: ', results);
        callback(null, results)
    })
}
// -------------------- FIM DE CONSULTAS NO BANCO PARA USUÁRIOS!


// -------------------- INÍCIO DE CONSULTAS NO BANCO PARA PSICÓLOGOS:
// Adicionar agenda:
const addAgenda = (agenda, callback) => {
    console.log('Agenda no sql: ', agenda)
    conexao.query(`INSERT INTO agenda (horaIni, horaFin, data, diaSemana, idUser) VALUES (?, ?, ?, ?, ?)`, [agenda.horaIni, agenda.horaFin, agenda.data, agenda.diaSemana, agenda.idPsico], (error, results) => {
        if (error) return console.log('Erro na consulta.');
        else if (results.affectedRows > 0) {
            console.log('Agenda adicionada com sucesso: ', results.insertId);
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
                    // Se já passou da hora final, finaliza a inserção.
                    console.log('Inserção de horários finalizada.');
                    console.log('Lista de horas:', horas);
                    return callback(null, { agenda: agenda, horas: horas });
                }

                conexao.query(`INSERT INTO horario (hora, idAgenda) VALUES (?, ?)`, [horaAtual, idAgenda], (error, results2) => {
                    if (error) {
                        console.log('Erro ao adicionar horário: ', error);
                    } else if (results2.affectedRows > 0) {
                        console.log('Horário adicionado com sucesso: ', horaAtual);
                        horas.push(horaAtual);
                    } else {
                        console.log('Nenhuma linha afetada ao adicionar horário: ', horaAtual);
                    }

                    var [hora, minuto] = horaAtual.split(':');
                    minuto = parseInt(minuto) + 30;
                    hora = parseInt(hora);

                    if (minuto >= 60) {
                        minuto = minuto - 60;
                        hora += 1;

                    }
                    horaAtual = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;

                    inserirHorario(); // Chama a função recursivamente.
                });
            }
            inserirHorario();
        }
        else {
            console.log('nenhuma linha foi afetada');
        }
    })

}

const deleteAgenda = (idAgenda, callback) => {
    conexao.query(`DELETE  horario, agenda FROM horario INNER JOIN agenda ON horario.idAgenda = agenda.idAgenda WHERE horario.idAgenda = ? `, [idAgenda], (error, results) => {
        if (error) return console.log('Erro na consulta: ', error);
        else if (results.affectedRows > 0) {
            console.log('Agenda deletada com Sucesso: ', results);
            callback(null, results)
        }
        else {
            console.log('Nenhuma Agenda Encontrado com esse Id');
        }
    })
}

const getPsicoAgenda = (idPsico, callback) => {
    conexao.query(`SELECT * FROM agenda WHERE idUser = ?`, [idPsico], (error, results) => {
        if (error) return console.log('Erro na Consulta');
        console.log('Agendas: ', results);
        callback(null, results);
    })
}



// -------------------- FIM DE CONSULTAS NO BANCO PARA PSICÓLOGOS!

//---------------------CONSULTA DE VERIFICAÇÃO DE PERFIL!
const verificarPerfil = (idUser, callback) =>{
    var query = `SELECT PERFIL FROM USUARIO WHERE idUser = ?`

    conexao.query(query, [idUser], (error, results)=>{
        if(error) return console.log('Erro: ', error)
        console.log('Resultado da consulta', results[0]);
        callback(null, results[0]);
    })
}

//-------------------- INÍCIO DE CONSULTAS NO BANCO PARA RECEPCIONISTAS:


// -------------------- FIM DE CONSULTAS NO BANCO PARA RECEPCIONISTAS!


// -------------------- INÍCIO DE CONSULTAS NO BANCO PARA CONSULTAS MÉDICAS:
const verificarConsulta = (credencial, callback) => {
    conexao.query(`SELECT usuario.nome AS NomePaciente, usuario.idUser AS idUser, horario.hora, agenda.data, agenda.diaSemana, profissionalpsicologo.nome AS NomePsico, horario.status, horario.idHorario FROM horario INNER JOIN usuario ON horario.idUser = usuario.idUser INNER JOIN agenda ON horario.idAgenda = agenda.idAgenda INNER JOIN profissionalpsicologo ON agenda.idPsico = profissionalpsicologo.idPsico WHERE usuario.nomeUser = ?`, [credencial], (error, results) => {
        if (error) return console.log('Erro na consulta: ', error);
        else if (results.length > 0) {
            console.log('Usuário encontrado!', results);
            callback(null, results);
        }
        else {
            console.log('Usuário não encontrado!');
            callback(null, results);
        }
    })
}

const putStatusConsult = (horario, callback) => {
    conexao.query(`UPDATE horario SET status = 'presente' WHERE idHorario = ?`, [horario.idHorario], (error, results1) => {
        if (error) return console.log('Erro na consulta: ', error);

        conexao.query(`SELECT usuario.nome AS NomePaciente, horario.hora, horario.status AS status,agenda.data, agenda.diaSemana, profissionalpsicologo.nome AS NomePsico, horario.status, horario.idHorario FROM horario INNER JOIN usuario ON horario.idUser = usuario.idUser INNER JOIN agenda ON horario.idAgenda = agenda.idAgenda INNER JOIN profissionalpsicologo ON agenda.idPsico = profissionalpsicologo.idPsico WHERE usuario.idUser = ?`, [horario.idUser], (error, results2) => {
            if (error) return console.log('Erro na consulta: ', error);
            callback(null, results1, results2);
        })
    })
}
// -------------------- FIM DE CONSULTAS NO BANCO PARA CONSULTAS MÉDICAS!

export  {
    addUser,
    loginUser,
    getPsico,
    getHorario,
    updateHorario,
    getUser,
    verificarPerfil,
    updateUser,
    deleteHorario,
    getAgenda,
    addAgenda,
    getHours,
    deleteAgenda,
    getPsicoAgenda,
    getEmail,
    verificarConsulta,
    
    putStatusConsult
}