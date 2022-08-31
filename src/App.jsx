import logo from './logo.svg';
import './App.css';
import Amplify, {API, graphqlOperation, Storage } from 'aws-amplify';
import awsconfig from './aws-exports';
import {AmplifySignOut, withAuthenticator} from '@aws-amplify/ui-react';
import {listTodos} from './graphql/queries';
import {updateTodo, createTodo} from './graphql/mutations';
import { useEffect, useState } from 'react';
import {Paper, IconButton, TextField} from '@material-ui/core';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import FavoriteIcon from '@material-ui/icons/Favorite';
import PauseIcon from '@material-ui/icons/Pause';
import ReactPlayer from 'react-player';
import AddIcon from '@material-ui/icons/Add';
import PublishIcon from '@material-ui/icons/Publish';
import { v4 as uuid} from 'uuid';



Amplify.configure(awsconfig);

function App() {
  const [lists, setList] = useState([]);
  const [songPlaying, setSongPlaying] = useState('');
  const [audioURL, setAudioURL] = useState('');
  const [showAddSong, setShowAddNewSong] = useState(false);

  useEffect(() =>{
    fetchList();
  }, [])

  const toggleSong = async idx => {
    if(songPlaying === idx){
      setSongPlaying('');
      return
    }

    const songFilePath = lists[idx].filePath;

    try {
      const fileAccessURL = await Storage.get(songFilePath, {expires: 60})
      console.log('access url', fileAccessURL);
      setSongPlaying(idx);
      setAudioURL(fileAccessURL);
      return;
    } catch(error){
      console.log('error song file from s3 ', error);
      setAudioURL('');
      setSongPlaying('');
    }
    
  }

  const fetchList = async () =>{
    try{
      const listData = await API.graphql(graphqlOperation(listTodos));
      const listlist = listData.data.listTodos.items;
      console.log('List list', listlist);
      setList(listlist);
    }catch (error){
      console.log('error on fetch List', error);
    }
  }

  const addLike = async (idx) => {
    try{
      const list = lists[idx];
      list.like = list.like +1;
      delete list.createdAt;
      delete list.updatedAt;

      const listData = await API.graphql(graphqlOperation(updateTodo, {input: list }));
      const newList = [...lists];
      newList[idx] = listData.data.updateTodo;
      setList(newList);



    }catch(error){
      console.log('error on like update', error);
    }
  }


  return (
    <div className="App">
      <header className="App-header">
        <AmplifySignOut />
        <h2>THIS IS MY APP</h2>
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <div className="newList">
        { lists.map((list, idx) => {
          return (
            <Paper variant="outlined" elevation={2} key={`list${idx}`}>
              <div className="listCard">
                <IconButton aria-label="play" onClick={() => toggleSong(idx)}>
                  {songPlaying === idx ? <PauseIcon/> : <PlayArrowIcon />}
                </IconButton>
                <div>
                  <div className="Title">{list.name}</div>
                  <div className="owner">{list.owner}</div>
                </div>
                <div>
                  <IconButton aria-label="like" onClick={() => addLike(idx)}>
                    <FavoriteIcon />
                  </IconButton>
                  {list.like}
                </div>
                <div className="desc">{list.description}</div>
                
              </div>
              {
                songPlaying === idx ? (
                    <div className='audioPlayer'>
                      <ReactPlayer 
                        url={audioURL}
                        controls
                        playing
                        height="50px"
                        onPause={() => toggleSong(idx)}
                      />
                    </div>
                ) : null
              }
            </Paper>
          )
        })}
        {showAddSong ? (
            <AddSong onUpload={() =>{
              setShowAddNewSong(false)
              fetchList()
            }} />
        ): <IconButton onClick={() => setShowAddNewSong(true)}><AddIcon/></IconButton>
        }
      </div>
    </div>
  );
}

export default withAuthenticator(App);


const AddSong = ({onUpload}) =>{

  const [songData, setSongData] = useState({});
  const [mp3Data, setMp3Data] = useState({});

  const uploadSong = async () =>{
    //upload the song
    console.log("song data:" ,songData);
    const {name, description, owner} = songData;

    const { key } = await Storage.put(`${uuid()}.mp3`, mp3Data, { contentType: 'audio/mp3'});

    const createSongInput = {
      id: uuid(),
      name,
      description,
      owner,
      filePath: key,
      like: 0
    }
    await API.graphql(graphqlOperation(createTodo, {input:createSongInput}))
    onUpload()
  }
  return(
    <div className="newSong">
      <TextField label="Title" value={songData.name} onChange={e => setSongData({...songData, name:e.target.value})}/>
      <TextField label="Artist" value={songData.owner} onChange={e => setSongData({...songData, owner:e.target.value})}/>
      <TextField label="Description" value={songData.description} onChange={e => setSongData({...songData, description:e.target.value})}/>
      <input type="file" accept="audio/mp3" onChange={e => setMp3Data(e.target.files[0])}/>
      <IconButton onClick={uploadSong}>
        <PublishIcon />
      </IconButton>
    </div>
  )
}