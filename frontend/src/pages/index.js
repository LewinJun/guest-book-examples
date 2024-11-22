import { utils } from "near-api-js";
import { useState, useEffect, useContext, useCallback, useRef } from "react";

import Form from "@/components/Form";
import SignIn from "@/components/SignIn";
import Messages from "@/components/Messages";
import styles from "@/styles/app.module.css";

import { NearContext } from "@/context";
import { GuestbookNearContract } from "@/config";

export default function Home() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("normal")
  const pageSize = 50

  const getNextPageMessage = useCallback(async ()=> {
    if (status !== 'normal') {
      return
    }
    setStatus('loading')
    try {
      const total_messages = await wallet.viewMethod({
        contractId: GuestbookNearContract,
        method: "total_messages",
      });
      if (total_messages === messages.length) {
        setStatus('normal')
        return;
      }
      const offPage = total_messages - messages.length
      const from_index = offPage;
      const limit = `${from_index < pageSize ? from_index : pageSize}`
      wallet.viewMethod({
        contractId: GuestbookNearContract,
        method: "get_messages",
        args: { from_index: String(from_index), limit: limit },
      }).then((msgs)=>{
        const newMsgs = [...messages, ...msgs.reverse()];
        setMessages(newMsgs)
        setStatus('normal')
      }).catch(e=>{
        setStatus('normal')
      });
    } catch (error) {
      setStatus('normal')
    }
  }, [messages, status])

  useEffect(() => {
    getLast10Messages().then((messages) => {
      setMessages(messages.reverse())
    });
    
  }, []);

  useEffect(()=>{
    const scrollBack = ()=> {
      const currentMaxY = document.body.clientHeight - document.documentElement.clientHeight
      if (window.scrollY >= currentMaxY - 20) {
        getNextPageMessage()
      }
    }
    window.addEventListener('scroll', scrollBack)
    return ()=> {
      window.removeEventListener('scroll', scrollBack)
    }
  }, [messages,status])

  const getLast10Messages = async () => {
    const total_messages = await wallet.viewMethod({
      contractId: GuestbookNearContract,
      method: "total_messages",
    });
    const from_index = total_messages >= pageSize ? total_messages - pageSize : 0;
    return wallet.viewMethod({
      contractId: GuestbookNearContract,
      method: "get_messages",
      args: { from_index: String(from_index), limit: `${pageSize}` },
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const { fieldset, message, donation } = e.target.elements;

    fieldset.disabled = true;

    // Add message to the guest book
    const deposit = utils.format.parseNearAmount(donation.value);
    await wallet.callMethod({
      contractId: GuestbookNearContract,
      method: "add_message",
      args: { text: message.value },
      deposit,
    });

    // Get updated messages
    const messages = await getLast10Messages();
    setMessages(messages.reverse());

    message.value = "";
    donation.value = "0";
    fieldset.disabled = false;
    message.focus();
  };

  return (
    <main className={styles.main}>
      <div className="container">
        <h1>📖 NEAR Guest Book</h1>
        {signedAccountId ? (
          <Form onSubmit={onSubmit} currentAccountId={signedAccountId} />
        ) : (
          <SignIn />
        )}
      </div>
      
      {!!messages.length && <Messages messages={messages} />}
      {status === 'loading' && <div className={styles.loading}>Loading...</div>}
    </main>
  );
}
