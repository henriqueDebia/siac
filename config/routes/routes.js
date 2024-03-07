const express = require('express');
const db = require('../../helper/sql');
const router = express.Router();
const token = require('../token/token')
const WppTwilio = require('../twilio/twilio')
const session = require('express-session');

router.get('/', (req, res)=>{
    res.render('home');
})

/*Inicio configuração de rotas do usuario */

router.get('/user/cadastro', (req, res)=>{
    res.render('usuario/cadastro');
})

router.post('/user/cadastro', async(req, res)=>{
    console.log('Dados Recebidos: ', req.body);
    const {nome, email, nomeUser, password} = req.body;
    const user ={
        nome: nome,
        email: email,
        nomeUser: nomeUser,
        password: password
    }
    
     db.addUser(user, (error, results, usuario)=>{
        if(error){
            console.log('Erro ao adicionar cliente ', error.message);
            res.status(500).send('Erro ao Adicionar Cliente');
        }
        else if(results.affectedRows>0){
            console.log('Usuario adicionado com sucesso', usuario);
            WppTwilio.enviarMensagem(`
            Prezado Cliente, seu usuário foi cadastrado com sucesso no sistema\n\n
            nome: ${usuario.nome} \n
            E-mail: ${usuario.email}\n
            Nome de Usuário: ${usuario.nomeUser}
            `).then(()=>{
                console.log('Mensagem de Wpp enviada com sucesso!')
            }).catch((error)=>{
                console.error('Erro ao enviar mensagem para o cliente')
            })
            res.status(201).render('login'); // método send não aceita múltiplos argumentos
        }
    });
    
});
router.get('/user/login', (req,res)=>{
    res.render('usuario/login')
})

router.post('/user/login', async (req, res)=>{
    console.log('Dados Recebidos:', req.body);
    const {emailUsuario, password} = req.body;
    const user = {
        emailUsuario: emailUsuario,
        password: password
    }
    db.loginUser(user, async(error, results) =>{
        if(error){
            console.log('Erro de solicitação select', error.message);
            res.status(500).send('Erro de solicitação no bd');
        }
        else if(results.length>0){
            console.log('Usuário encontrado!');
            let tokenGerado = await token.gerarToken(results[0].idUser);
            console.log('token Gerado:', tokenGerado);
            
            req.session.id = results[0].idUser //pegando o id do banco e armazenando na requisição id do session
            //armazenando o token na requisiçao token do session
            req.session.token = tokenGerado;
            console.log('Id da sessão: ',req.session.id);
            const idUser = results[0].idUser;

            res.status(200).json({message:'autenticação realizada e token enviado para o user',auth: true,  token: tokenGerado, idUser: idUser});

            
        } 
        else{
            console.log('usuário não encontrado!');
            res.status(400).send('Usuário não encontrado');
        }
    });
})

//abrir pagina principal
router.get('/user/principal', (req,res)=>{
    res.render('usuario/principal');
})



router.get('/principal/verificarToken', token.verficarToken, (req,res)=>{
    res.status(200).json({message: 'token verificado com Sucesso'});
})

//verificar token
router.post('/principal/verificarToken', token.verficarToken, (req, res)=>{
    console.log('dados recebidos: ', req.body);
    var {idUser} = req.body
     idUser = parseInt(idUser);
    console.log('int: ', idUser);
    db.getAgenda(idUser, (error, results)=>{
        if(error) return res.status(500).json({message: 'Falha na consulta!'})
        res.status(200).json({message: 'Enviando dados sobre a consulta: ', data: results});
    })
})

//abrir pagina de Agendamento
router.get('/user/agendamento',  (req,res)=>{
    res.render('usuario/agendamento');
})

// Pegar dados do psico e agenda, e exibir na tela de agendamento
router.get('/user/agendamento/dadosPsico', (req,res)=>{
    
    db.getPsico((error, results)=>{
        if(error) return res.status(400).json({message: 'Falha ao buscar Consultas'});
        else {
            console.log('Resultado da Consulta: ', results);
            if(results.psicologos.length == 0) return res.status.json({message: 'Sem psicologos'});
            if(results.agenda.length ==0) return res.status(200).json({message:'Sem Agenda!'});
            res.status(200).json({message: 'Agenda: ', agenda: results.agenda, message: 'Psicologo: ', psicologos: results.psicologos, message: 'Horários: ', horarios: results.horarios})


        }

    })
    

})
router.post('/user/inserirHorario', (req,res)=>{
    console.log('dados recebidos: ', req.body)
    var {idUser, hora} = req.body;
    idUser = parseInt(idUser);
    var horario = {
        idUser: idUser,
        hora: hora
    }
    console.log('Horario: ', horario);

    db.getHorario(horario, (error,results)=>{
        if(error) return res.status(400).json({message: 'erro na inserção de dados'})
        else if(results.affectedRows>0){
            return res.status(200).json({message: 'Usuário inserido com sucesso', data: results});
        }
        else{
            return res.status(400).json({message: 'Nenhuma linha afetada'});
        }
    });

})
router.post('/user/inserirHorario/wpp', (req,res)=>{

    console.log('dados recebidos: ', req.body)
    var {idUser, hora} = req.body;
    idUser = parseInt(idUser);
    var horario = {
        idUser: idUser,
        hora: hora
    }
    console.log('Horario: ', horario);
    db.updateHorario(horario, (error,results)=>{
        if(error) return res.status(400).json({message: 'erro na inserção de dados'})
        else if(results.affectedRows>0){
            console.log('agendamento realizado: ', results);
            res.status(200).json({message: 'Usuário inserido com sucesso'});
            WppTwilio.enviarMensagem(`
                Prezado Usuario SIAC, sua consulta foi agendada com sucesso \n\n 
                
            `).then(()=> console.log('Mensagem enviada com sucesso!')).catch((error)=>console.log('Falha ao enviar a mensagem para o cliente'))
        }
        else{
            return res.status(400).json({message: 'Nenhuma linha afetada'});
        }
    });
})


router.get('/user/principal/conta', (req,res)=>{
    res.render('usuario/contaUsuario');
})

router.post('/user/principal/conta/detalhes', (req,res)=>{
    console.log('dados recebidos: ', req.body);
    var idUser = parseInt(req.body.idUser)
    console.log('inteiro de idUser: ', idUser);

    db.getUser(idUser, (error, results)=>{
        if(error) { 
            return res.status(400).json({message: 'Erro Ao consultar Banco'});
        }
        else if(results) {
            return res.status(200).json({message: 'Usuário encontrado', data: results});
        }
        else{
            return res.status(400).json({message: 'Usuario não encontrado !'});
        }
    })
    
})
router.put('/user/principal/conta/update/:idUser', (req,res)=>{
    var idUser = req.params.idUser;
    console.log ('Id passado na URL: ', idUser);

    console.log('Dados recebidos ', req.body);
    var {nome, email, celular, nomeUser} = req.body;

    var usuario = {
        nome: nome,
        email: email,
        celular: celular,
        nomeUser: nomeUser,
        idUser: idUser
    }

    db.updateUser(usuario, (error, results, userAtualizado)=>{
        
        if(error) return res.status(400).json({message: 'Erro ao consultar no banco de dados', error: error});
        else if(results.affectedRows>0){

            console.log('dados do usuario pelo route.js: ', userAtualizado);
            WppTwilio.enviarMensagem(`
                Usuario Atualizado com Sucesso \n\n
                Nome: ${userAtualizado.nome}
                Email: ${userAtualizado.email}
                Nome de Usuário: ${userAtualizado.nomeUser}
                Celular: ${userAtualizado.celular}
            `)
            res.status(200).json({message: 'update realizado !', data: userAtualizado});
        }
        else{
            console.log(results);
            res.status(400).json({message: 'Nenhum linha afetada'});
        }
    })
})
router.delete('/user/principal/conta/deletarConsulta/:idHorario', (req,res)=>{
    console.log('dados para delete: ', req.params.idHorario);
    var idHorario = req.params.idHorario;
    db.deleteHorario(idHorario, (error, results)=>{
        if(error) res.status(500).json({message: 'Erro na consulta!', error});
        res.status(200).json({message: 'id da Consulta deletada: ', results})
    })

})

/*Fim configuração de rotas do usuario */

/*Inicio configuração de rotas do Psicologo */

router.post('/psico/agenda/exibirAgenda', (req, res)=>{
    console.log('Dados Recebidos: ', req.body);
    var {idPsico} = req.body;
    console.log('Id psico: ', idPsico);
    db.getPsicoAgenda(idPsico, (error,results)=>{
        if(results.length == 0) return res.status(400).json({message: 'Resultado da consulta undefined ou usuario não encontrado!'})
        res.status(200).json({message:'Usuario encontrado!', agenda: results});
    })
    
})

router.post('/psicologo/gerarAgenda', (req,res)=>{
    console.log('dados recebidos: ',req.body);
    const {horaIni, horaFin, diaSemana, data, idPsico} = req.body;
    var agenda = {
        horaIni: horaIni,
        horaFin, horaFin,
        diaSemana, diaSemana,
        data: data,
        idPsico: idPsico
    }
    console.log('agenda: ', agenda);
    db.addAgenda(agenda, (error, results)=>{    
        if(error) return res.status(400).json({message: 'Erro na consulta: ', error: error});
        else if(results.agenda){
            console.log('Agenda inserida route.js: ', results.agenda);
            if(results.horas.length>0){
                console.log('Horarios adicionados route.js: ', results.horas);
                res.status(200).json({message: 'Agendas adicionada', agenda: results.agenda, message: 'Horarios Adicionados: ', horarios: results.horas});
            }
            else{
                res.status(400).json({message: 'Horarios não foram adicionados ou não estão no array'});
            }
        }
        else{
            res.status(401).json({message: 'Agenda não inserida'});
        }
    })

})
router.delete('/psico/agenda/deletarAgenda/:idAgenda', (req,res)=>{
    console.log('Id para deleção: ', req.params.idAgenda);
    var idAgenda = req.params.idAgenda;

    db.deleteAgenda(idAgenda, (error, results)=>{
        res.status(200).json({message: 'Agenda foi excluida com Sucesso: ', data: results});
    })

})
router.get('/psico/login', (req,res)=>{
    res.render('psicologo/login')
})

router.post('/psico/login',  (req,res)=>{
    console.log('Dados recebidos: ', req.body);
    const {email, senha} = req.body;
    var psicoLogin ={
        email: email,
        senha: senha
    }
    db.getPsicoLogin(psicoLogin, async(error,results)=>{
        if(error) return res.status(500).json({message: 'Falha ao Buscar psicologo'});
        console.log('psicologo router.js: ',results[0]);
        const tokenGerado = await token.gerarToken(results[0].idPsico);
        console.log('Token: ', tokenGerado);
        res.status(200).json({message: 'Psicologo encontrado: ', psico: results[0], message: 'Enviando token ', token: tokenGerado });
    })
    
})

router.post('/psico/cadastro', (req,res)=>{
    console.log('Dados recebidos', req.body);
    const {nome, email, cidade, senha} = req.body
    var psico = {
        nome: nome,
        email: email,
        cidade: cidade,
        senha: senha
    }
    db.addPsico(psico, (error, results)=>{
        if(results.affectedRows>0){
            res.status(201).json({message: 'Psicologo Adicionado com Sucesso', results: results});
        }
        else{
            res.status(200).json({message: 'Ja existe um psicologo com esse cadastro', results: results})
        }
    })
    
})

router.get('/psico/principal/verificarToken', token.verficarToken, (req,res)=>{
    res.status(200).json({message: 'Token validado Com sucesso!'})
})

router.get('/psico/principal', (req,res)=>{
    res.render('psicologo/principal');
})
router.get('/psicologo/principal/agenda', (req, res)=>{
    res.render('psicologo/agenda');
})
/*Fim configuração de rotas do Psicologo */


/** Inicio da configuração de Rotas do Recepcionista*/
router.get('/recepcionista/principal/verificarConsulta', (req,res)=>{
    res.render('recepcionista/verificacaoAgendamento')
})

router.post('/recepcionista/principal/verificarConsulta', (req,res)=>{
    console.log('Dados recebidos: ', req.body);
    var credencial = req.body.inputCred;
    console.log('Credencial: ', credencial);
    db.verificarConsulta(credencial, (error, results)=>{
        res.status(200).json({message: 'Enviando dados para o cliente: ', consulta: results});
    })
})

router.post('/recepcionista/principal/verificarConsulta/confirmarPresenca', (req,res)=>{
    console.log('Dados recebidos: ', req.body);
    var {idHorario, idUser} = req.body;
    idHorario = parseInt(idHorario);
    idUser = parseInt(idUser);
    var horario={
        idHorario: idHorario,
        idUser: idUser
    }


    db.putStatusConsult(horario, (error, results1, results2)=>{
        res.status(200).json({message: 'Resposta do servidor: ', error: error, results: results1, dados: results2});
    })
})



module.exports = {
    router,
    session
}
