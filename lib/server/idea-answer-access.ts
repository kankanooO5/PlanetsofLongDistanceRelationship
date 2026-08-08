export function canRevealPartnerIdeaAnswer(
  questionDate: string,
  currentDate: string,
  hasOwnAnswer: boolean,
) {
  /*
    ISO 日期 YYYY-MM-DD 可以直接按字符串比较。

    当天：
    自己回答后才能解锁对方正文。

    过去日期：
    无论自己当时有没有回答，
    都自动解锁对方已经提交的回答。

    未来日期：
    不允许提前查看。
  */
  if (questionDate < currentDate) {
    return true;
  }

  if (questionDate > currentDate) {
    return false;
  }

  return hasOwnAnswer;
}
